import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";

import reposRouter from "./routes/repos.js";
import worktreesRouter from "./routes/worktrees.js";
import portsRouter from "./routes/ports.js";
import processesRouter from "./routes/processes.js";
import browseRouter from "./routes/browse.js";
import workspaceRouter from "./routes/workspace.js";
import { addClient, removeClient, handleMessage } from "./ws/handler.js";
import { buildSnapshot, startPoller } from "./ws/poller.js";
import { killAllProcesses } from "./services/process.service.js";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use("/api/*", cors());

// API routes
app.route("/api/repos", reposRouter);
app.route("/api/worktrees", worktreesRouter);
app.route("/api/ports", portsRouter);
app.route("/api/processes", processesRouter);
app.route("/api/browse", browseRouter);
app.route("/api/workspace", workspaceRouter);

app.get("/api/status", (c) => {
  const worktrees = buildSnapshot();
  return c.json({ worktrees });
});

app.get("/api/health", (c) => c.json({ status: "ok" }));

// WebSocket
app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_, ws) {
      addClient(ws);
      // Send initial snapshot
      const worktrees = buildSnapshot();
      ws.send(JSON.stringify({ type: "status:update", data: worktrees }));
    },
    onMessage(event, ws) {
      handleMessage(ws, event.data as string);
    },
    onClose(_, ws) {
      removeClient(ws);
    },
  }))
);

// Static files (production build)
app.use("/*", serveStatic({ root: "./client/dist" }));

const PORT = 4000;

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

injectWebSocket(server);

// Start polling
startPoller();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  killAllProcesses();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAllProcesses();
  process.exit(0);
});
