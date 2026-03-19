import { execSync } from "node:child_process";

interface RawWorktree {
  path: string;
  branch: string;
  commitHash: string;
  isMain: boolean;
}

export function listWorktrees(repoPath: string): RawWorktree[] {
  const output = execSync(`git -C "${repoPath}" worktree list --porcelain`, {
    encoding: "utf-8",
    timeout: 5000,
  });

  const worktrees: RawWorktree[] = [];
  let current: Partial<RawWorktree> = {};

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) worktrees.push(current as RawWorktree);
      current = { path: line.slice(9), isMain: false };
    } else if (line.startsWith("HEAD ")) {
      current.commitHash = line.slice(5);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice(7).replace("refs/heads/", "");
    } else if (line === "bare") {
      current.branch = "(bare)";
    } else if (line === "") {
      // empty line separates entries
    }
  }
  if (current.path) worktrees.push(current as RawWorktree);

  // First worktree is the main one
  if (worktrees.length > 0) worktrees[0].isMain = true;

  return worktrees;
}

export function createWorktree(
  repoPath: string,
  baseBranch: string,
  newBranch: string
): string {
  // Determine next worktree number
  const existing = listWorktrees(repoPath);
  const repoName = repoPath.split("/").pop() || "repo";
  const wtCount = existing.filter((wt) => wt.path.includes("-wt-")).length;
  const wtDir = `${repoPath}-wt-${wtCount + 1}`;

  execSync(
    `git -C "${repoPath}" worktree add -b "${newBranch}" "${wtDir}" "${baseBranch}"`,
    { encoding: "utf-8", timeout: 15000 }
  );

  return wtDir;
}

export function removeWorktree(repoPath: string, wtPath: string): void {
  execSync(`git -C "${repoPath}" worktree remove "${wtPath}" --force`, {
    encoding: "utf-8",
    timeout: 10000,
  });
}

export interface WorktreeHealth {
  behindMain: number;
  aheadOfMain: number;
  isDirty: boolean;
  isMerged: boolean;
  lastCommitAge: number; // seconds since last commit
  lastCommitDate: string; // ISO string
}

export function getWorktreeHealth(repoPath: string, wtPath: string, branch: string): WorktreeHealth {
  const defaults: WorktreeHealth = {
    behindMain: 0,
    aheadOfMain: 0,
    isDirty: false,
    isMerged: false,
    lastCommitAge: 0,
    lastCommitDate: "",
  };

  try {
    // Find default branch (main or master)
    let defaultBranch = "main";
    try {
      const branches = execSync(`git -C "${repoPath}" branch --list main master`, {
        encoding: "utf-8",
        timeout: 3000,
      }).trim();
      if (branches.includes("master") && !branches.includes("main")) {
        defaultBranch = "master";
      }
    } catch {}

    // Behind/ahead of main
    try {
      const counts = execSync(
        `git -C "${wtPath}" rev-list --left-right --count ${defaultBranch}...HEAD 2>/dev/null`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      const [behind, ahead] = counts.split(/\s+/).map(Number);
      defaults.behindMain = behind || 0;
      defaults.aheadOfMain = ahead || 0;
    } catch {}

    // Dirty working tree
    try {
      const status = execSync(`git -C "${wtPath}" status --porcelain 2>/dev/null`, {
        encoding: "utf-8",
        timeout: 3000,
      }).trim();
      defaults.isDirty = status.length > 0;
    } catch {}

    // Is branch merged into main?
    try {
      const merged = execSync(
        `git -C "${repoPath}" branch --merged ${defaultBranch} 2>/dev/null`,
        { encoding: "utf-8", timeout: 3000 }
      );
      defaults.isMerged = merged.split("\n").some(
        (b) => b.trim() === branch
      );
    } catch {}

    // Last commit date
    try {
      const dateStr = execSync(
        `git -C "${wtPath}" log -1 --format=%cI 2>/dev/null`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      if (dateStr) {
        defaults.lastCommitDate = dateStr;
        defaults.lastCommitAge = Math.floor(
          (Date.now() - new Date(dateStr).getTime()) / 1000
        );
      }
    } catch {}
  } catch {}

  return defaults;
}

export function parseBranchObjective(branch: string): string {
  // Pattern: type/number-description or type/description
  const match = branch.match(
    /^(?:feat|fix|chore|refactor|hotfix|feature|bugfix)\/(?:(\d+)[-_])?(.+)$/
  );
  if (!match) return branch;

  const [, ticketNum, description] = match;
  const readable = description
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return ticketNum ? `${readable} #${ticketNum}` : readable;
}
