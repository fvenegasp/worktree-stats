import { Hono } from "hono";
import * as configService from "../services/config.service.js";
import * as gitService from "../services/git.service.js";

const repos = new Hono();

repos.get("/", (c) => {
  return c.json(configService.getRepos());
});

repos.post("/", async (c) => {
  const body = await c.req.json<{
    path: string;
    devCommand: string;
    defaultPort: number;
    portRange?: [number, number];
  }>();

  if (!body.path || !body.devCommand || !body.defaultPort) {
    return c.json({ error: "path, devCommand, and defaultPort are required" }, 400);
  }

  const repo = configService.addRepo(body);
  return c.json(repo, 201);
});

repos.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = configService.updateRepo(id, body);
  if (!updated) return c.json({ error: "Repo not found" }, 404);
  return c.json(updated);
});

repos.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = configService.deleteRepo(id);
  if (!deleted) return c.json({ error: "Repo not found" }, 404);
  return c.json({ ok: true });
});

repos.get("/:id/worktrees", (c) => {
  const id = c.req.param("id");
  const repo = configService.getRepo(id);
  if (!repo) return c.json({ error: "Repo not found" }, 404);

  try {
    const worktrees = gitService.listWorktrees(repo.path);
    return c.json(
      worktrees.map((wt) => ({
        ...wt,
        objective: gitService.parseBranchObjective(wt.branch),
      }))
    );
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

repos.post("/:id/worktrees", async (c) => {
  const id = c.req.param("id");
  const repo = configService.getRepo(id);
  if (!repo) return c.json({ error: "Repo not found" }, 404);

  const { baseBranch, newBranch } = await c.req.json<{
    baseBranch: string;
    newBranch: string;
  }>();

  try {
    const wtPath = gitService.createWorktree(repo.path, baseBranch, newBranch);
    return c.json({ path: wtPath, branch: newBranch }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

repos.delete("/:id/worktrees", async (c) => {
  const id = c.req.param("id");
  const repo = configService.getRepo(id);
  if (!repo) return c.json({ error: "Repo not found" }, 404);

  const { path } = await c.req.json<{ path: string }>();

  try {
    gitService.removeWorktree(repo.path, path);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default repos;
