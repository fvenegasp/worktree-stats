import { useEffect, useRef, useState, useCallback } from "react";
import type { WorktreeInfo } from "../lib/api";

export function useWebSocket() {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<{ path: string; line: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "status:update") {
          setWorktrees(msg.data);
        } else if (msg.type === "process:output") {
          setLogs((prev) => [...prev.slice(-200), msg.data]);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { worktrees, connected, logs };
}
