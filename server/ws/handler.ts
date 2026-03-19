import type { WSContext } from "hono/ws";
import type { WsMessage } from "../types.js";

export type WsBroadcast = (msg: object) => void;

const clients = new Set<WSContext>();

export function addClient(ws: WSContext): void {
  clients.add(ws);
}

export function removeClient(ws: WSContext): void {
  clients.delete(ws);
}

export function broadcast(msg: object): void {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    try {
      ws.send(data);
    } catch {
      clients.delete(ws);
    }
  }
}

export function handleMessage(ws: WSContext, raw: string): void {
  try {
    const msg: WsMessage = JSON.parse(raw);
    // Handle subscribe messages if needed in the future
    if (msg.type === "subscribe") {
      // Could filter repos per client
    }
  } catch {}
}

export function getClientCount(): number {
  return clients.size;
}
