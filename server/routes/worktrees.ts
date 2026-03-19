import { Hono } from "hono";
import { broadcast } from "../ws/handler.js";
import * as processService from "../services/process.service.js";
import * as portService from "../services/port.service.js";
import * as configService from "../services/config.service.js";

const worktrees = new Hono();

worktrees.post("/start", async (c) => {
  const { path, port } = await c.req.json<{ path: string; port?: number }>();

  // Find the repo this worktree belongs to
  const repos = configService.getRepos();
  const repo = repos.find((r) => path.startsWith(r.path));

  const assignedPort =
    port || (repo ? portService.autoAssignPort(repo) : null);
  if (!assignedPort) {
    return c.json({ error: "No available port" }, 400);
  }

  const devCommand = repo?.devCommand || "npm run dev";

  const status = processService.startDevServer(
    path,
    devCommand,
    assignedPort,
    broadcast
  );
  return c.json(status);
});

worktrees.post("/stop", async (c) => {
  const { path } = await c.req.json<{ path: string }>();
  const stopped = processService.stopDevServer(path);
  return c.json({ ok: stopped });
});

worktrees.post("/port", async (c) => {
  const { path, port } = await c.req.json<{ path: string; port: number }>();

  if (!portService.isPortFree(port)) {
    return c.json({ error: `Port ${port} is already in use` }, 400);
  }

  return c.json({ path, port, assigned: true });
});

export default worktrees;
