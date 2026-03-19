import { useState } from "react";
import { api } from "../lib/api";

interface Props {
  worktreePath: string;
  running: boolean;
  port?: number;
}

export function ProcessControls({ worktreePath, running, port }: Props) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (running) {
        await api.stopServer(worktreePath);
      } else {
        await api.startServer(worktreePath, port);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`group relative overflow-hidden rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 ${
        running
          ? "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
      }`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
        </span>
      ) : running ? (
        "Stop"
      ) : (
        "Start"
      )}
    </button>
  );
}
