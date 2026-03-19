import { broadcast, getClientCount } from "./handler.js";
import { getRepos } from "../services/config.service.js";
import { listWorktrees, parseBranchObjective, getWorktreeHealth } from "../services/git.service.js";
import { scanListeningPorts, getProcessCwd } from "../services/port.service.js";
import { detectClaudeSessions, matchSessionToWorktree } from "../services/claude.service.js";
import { getProcessStatus } from "../services/process.service.js";
import type { WorktreeInfo, PortInfo } from "../types.js";

let lastSnapshot = "";

// Cache PID→cwd lookups (PIDs don't change cwd often)
const pidCwdCache = new Map<number, { cwd: string | null; ts: number }>();
const CWD_CACHE_TTL = 15000; // 15s

function getCachedCwd(pid: number): string | null {
  const cached = pidCwdCache.get(pid);
  if (cached && Date.now() - cached.ts < CWD_CACHE_TTL) {
    return cached.cwd;
  }
  const cwd = getProcessCwd(pid);
  pidCwdCache.set(pid, { cwd, ts: Date.now() });
  return cwd;
}

function matchPortsToWorktree(
  allPorts: PortInfo[],
  wtPath: string
): PortInfo[] {
  return allPorts.filter((p) => {
    const cwd = getCachedCwd(p.pid);
    if (!cwd) return false;
    return cwd.startsWith(wtPath);
  });
}

export function buildSnapshot(): WorktreeInfo[] {
  const repos = getRepos();
  const allPorts = scanListeningPorts();
  const claudeSessions = detectClaudeSessions();
  const worktrees: WorktreeInfo[] = [];

  for (const repo of repos) {
    try {
      const rawWorktrees = listWorktrees(repo.path);
      const wtPaths = rawWorktrees.map((wt) => wt.path);
      const sessionMap = matchSessionToWorktree(claudeSessions, wtPaths);

      for (const wt of rawWorktrees) {
        // Match ports by PID→cwd correlation
        const wtPorts = matchPortsToWorktree(allPorts, wt.path);

        // Get health info
        const health = getWorktreeHealth(repo.path, wt.path, wt.branch);

        worktrees.push({
          path: wt.path,
          branch: wt.branch,
          commitHash: wt.commitHash,
          isMain: wt.isMain,
          repoId: repo.id,
          objective: parseBranchObjective(wt.branch),
          ports: wtPorts,
          claudeSessions: sessionMap.get(wt.path) || [],
          devServer: getProcessStatus(wt.path),
          health,
        });
      }
    } catch {
      // Repo might not be accessible
    }
  }

  return worktrees;
}

export function startPoller(): void {
  setInterval(() => {
    if (getClientCount() === 0) return;

    const worktrees = buildSnapshot();
    const snapshot = JSON.stringify(worktrees);

    if (snapshot !== lastSnapshot) {
      lastSnapshot = snapshot;
      broadcast({ type: "status:update", data: worktrees });
    }
  }, 3000);
}
