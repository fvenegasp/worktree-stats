import { Hono } from "hono";
import * as portService from "../services/port.service.js";

const ports = new Hono();

ports.get("/", (c) => {
  const listening = portService.scanListeningPorts();
  return c.json(listening);
});

export default ports;
