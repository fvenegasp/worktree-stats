import { Hono } from "hono";
import * as processService from "../services/process.service.js";

const processes = new Hono();

processes.get("/", (c) => {
  const running = processService.getRunningPaths();
  const statuses = running.map((path) => ({
    path,
    ...processService.getProcessStatus(path),
  }));
  return c.json(statuses);
});

export default processes;
