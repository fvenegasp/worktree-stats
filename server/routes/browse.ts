import { Hono } from "hono";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

const browse = new Hono();

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
  isSymlink: boolean;
}

browse.get("/", (c) => {
  let requestedPath = c.req.query("path") || homedir();
  requestedPath = resolve(requestedPath.replace(/^~/, homedir()));

  if (!existsSync(requestedPath)) {
    return c.json({ error: "Path does not exist", path: requestedPath }, 404);
  }

  const stat = statSync(requestedPath);
  if (!stat.isDirectory()) {
    requestedPath = dirname(requestedPath);
  }

  try {
    const entries = readdirSync(requestedPath, { withFileTypes: true });
    const dirs: DirEntry[] = [];

    for (const entry of entries) {
      // Skip hidden files except .git-related
      if (entry.name.startsWith(".") && entry.name !== ".git") continue;
      // Skip node_modules and other heavy dirs
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      const fullPath = join(requestedPath, entry.name);

      try {
        const isDir = entry.isDirectory() || entry.isSymbolicLink();
        if (!isDir) continue;

        // Check if it's actually a directory (resolve symlinks)
        try {
          const resolved = statSync(fullPath);
          if (!resolved.isDirectory()) continue;
        } catch {
          continue;
        }

        const isGitRepo = existsSync(join(fullPath, ".git"));

        dirs.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          isGitRepo,
          isSymlink: entry.isSymbolicLink(),
        });
      } catch {
        // Permission denied or broken symlink — skip
      }
    }

    // Sort: git repos first, then alphabetical
    dirs.sort((a, b) => {
      if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Check if current dir is a git repo
    const currentIsGitRepo = existsSync(join(requestedPath, ".git"));

    // Detect if it has worktrees
    let hasWorktrees = false;
    if (currentIsGitRepo) {
      try {
        const output = execSync(
          `git -C "${requestedPath}" worktree list --porcelain 2>/dev/null`,
          { encoding: "utf-8", timeout: 3000 }
        );
        const worktreeCount = output.split("worktree ").length - 1;
        hasWorktrees = worktreeCount > 1;
      } catch {}
    }

    return c.json({
      path: requestedPath,
      parent: dirname(requestedPath),
      isGitRepo: currentIsGitRepo,
      hasWorktrees,
      entries: dirs,
    });
  } catch (e: any) {
    return c.json(
      { error: "Cannot read directory", message: e.message, path: requestedPath },
      403
    );
  }
});

export default browse;
