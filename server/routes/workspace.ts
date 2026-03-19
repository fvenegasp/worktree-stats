import { Hono } from "hono";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import * as configService from "../services/config.service.js";

const workspace = new Hono();

interface ScannedRepo {
  name: string;
  path: string;
  alreadyRegistered: boolean;
}

// GET /api/workspace - list workspaces
workspace.get("/", (c) => {
  return c.json(configService.getWorkspaces());
});

// DELETE /api/workspace/:id
workspace.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = configService.deleteWorkspace(id);
  if (!deleted) return c.json({ error: "Workspace not found" }, 404);
  return c.json({ ok: true });
});

// POST /api/workspace/scan
workspace.post("/scan", async (c) => {
  const { path: rawPath } = await c.req.json<{ path: string }>();
  const wsPath = resolve(rawPath.replace(/^~/, homedir()));

  if (!existsSync(wsPath) || !statSync(wsPath).isDirectory()) {
    return c.json({ error: "Invalid directory path" }, 400);
  }

  const existingRepos = configService.getRepos();
  const existingPaths = new Set(existingRepos.map((r) => r.path));
  const repos: ScannedRepo[] = [];

  try {
    const entries = readdirSync(wsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;

      const fullPath = join(wsPath, entry.name);
      try {
        const stat = statSync(fullPath);
        if (!stat.isDirectory()) continue;

        const gitPath = join(fullPath, ".git");
        if (!existsSync(gitPath)) continue;

        // Skip worktrees: their .git is a file, not a directory
        const gitStat = statSync(gitPath);
        if (!gitStat.isDirectory()) continue;

        repos.push({
          name: entry.name,
          path: fullPath,
          alreadyRegistered: existingPaths.has(fullPath),
        });
      } catch {
        // skip inaccessible
      }
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }

  repos.sort((a, b) => a.name.localeCompare(b.name));
  return c.json({ path: wsPath, repos });
});

// POST /api/workspace/register-all
workspace.post("/register-all", async (c) => {
  const { workspacePath, repos } = await c.req.json<{
    workspacePath: string;
    repos: {
      path: string;
      devCommand: string;
      defaultPort: number;
    }[];
  }>();

  // Create or find workspace
  const ws = configService.addWorkspace(workspacePath);

  const existingRepos = configService.getRepos();
  const existingPaths = new Set(existingRepos.map((r) => r.path));
  const registered = [];

  for (const repo of repos) {
    if (existingPaths.has(repo.path)) continue;
    const created = configService.addRepo({
      path: repo.path,
      devCommand: repo.devCommand,
      defaultPort: repo.defaultPort,
      portRange: [repo.defaultPort, repo.defaultPort + 9],
      workspaceId: ws.id,
    });
    registered.push(created);
  }

  return c.json({ workspace: ws, registered, count: registered.length });
});

export default workspace;
