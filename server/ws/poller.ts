import { broadcast, getClientCount } from "./handler.js";
import { getRepos } from "../services/config.service.js";
import { listWorktrees, parseBranchObjective } from "../services/git.service.js";
import { scanListeningPorts } from "../services/port.service.js";
import { detectClaudeSessions, matchSessionToWorktree } from "../services/claude.service.js";
import { getProcessStatus } from "../services/process.service.js";
import type { WorktreeInfo } from "../types.js";

let lastSnapshot = "";

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
        // Find ports whose process cwd matches this worktree
        const wtPorts = allPorts.filter((p) => {
          // Simple heuristic: check if port is in repo's range
          if (repo.portRange) {
            return p.port >= repo.portRange[0] && p.port <= repo.portRange[1];
          }
          return false;
        });

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
