import { execSync } from "node:child_process";
import type { ClaudeSession } from "../types.js";

export function detectClaudeSessions(): ClaudeSession[] {
  try {
    const output = execSync(
      "ps aux | grep -E '[c]laude' | grep -v 'grep'",
      { encoding: "utf-8", timeout: 5000 }
    );

    const sessions: ClaudeSession[] = [];

    for (const line of output.trim().split("\n")) {
      if (!line) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1], 10);
      if (isNaN(pid)) continue;

      // Try to get cwd from lsof
      const cwd = getCwd(pid);
      if (cwd) {
        sessions.push({ pid, cwd });
      }
    }

    return sessions;
  } catch {
    return [];
  }
}

function getCwd(pid: number): string | null {
  try {
    const output = execSync(`lsof -p ${pid} -Fn 2>/dev/null | grep '^n.*cwd' || lsof -p ${pid} -d cwd -Fn 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 3000,
    });
    // Parse the cwd from lsof output
    for (const line of output.split("\n")) {
      if (line.startsWith("n/")) {
        return line.slice(1);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function matchSessionToWorktree(
  sessions: ClaudeSession[],
  worktreePaths: string[]
): Map<string, ClaudeSession[]> {
  const result = new Map<string, ClaudeSession[]>();

  for (const wtPath of worktreePaths) {
    result.set(wtPath, []);
  }

  for (const session of sessions) {
    for (const wtPath of worktreePaths) {
      if (session.cwd.startsWith(wtPath)) {
        result.get(wtPath)!.push(session);
        break;
      }
    }
  }

  return result;
}
