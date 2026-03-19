import { useState } from "react";
import type { WorktreeInfo } from "../lib/api";
import { PortBadge } from "./PortBadge";
import { ClaudeIndicator } from "./ClaudeIndicator";
import { ProcessControls } from "./ProcessControls";
import { HealthBadges } from "./HealthBadges";
import { LogViewer } from "./LogViewer";
import { api } from "../lib/api";

interface Props {
  worktree: WorktreeInfo;
  repoName: string;
  logs: { path: string; line: string }[];
  onDeleted?: () => void;
}

export function WorktreeCard({ worktree, repoName, logs, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const isRunning = worktree.devServer?.running ?? false;
  const hasLogs = logs.some((l) => l.path === worktree.path);

  const handleDelete = async () => {
    if (!confirm(`Delete worktree at ${worktree.path}?`)) return;
    setDeleting(true);
    try {
      await api.deleteWorktree(worktree.repoId, worktree.path);
      onDeleted?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const shortPath = worktree.path.replace(/^\/Users\/[^/]+\//, "~/");

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-300 ${
        worktree.health.isMerged && !worktree.isMain
          ? "border-emerald-500/15 bg-emerald-500/[0.02] opacity-70"
          : isRunning
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60"
      }`}
    >
      {/* Top accent line for running servers */}
      {isRunning && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {worktree.isMain ? (
                <span className="shrink-0 rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-400">
                  Main
                </span>
              ) : (
                <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                  WT
                </span>
              )}
              <h3 className="truncate text-sm font-semibold text-zinc-100">
                {worktree.objective}
              </h3>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-600">
              {worktree.branch}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            {!worktree.isMain && (
              <ProcessControls
                worktreePath={worktree.path}
                running={isRunning}
                port={worktree.devServer?.port}
              />
            )}
            {isRunning && (
              <button
                onClick={() => setShowLogs(!showLogs)}
                className={`rounded-md p-1.5 transition-colors ${
                  showLogs
                    ? "bg-zinc-800 text-zinc-300"
                    : "text-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-400"
                }`}
                title="Toggle logs"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {!worktree.isMain && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md p-1.5 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                title="Delete worktree"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Path */}
        <p className="mb-3 truncate font-mono text-[10px] text-zinc-700">
          {shortPath}
        </p>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {worktree.devServer?.running && (
            <PortBadge port={worktree.devServer.port} active={true} />
          )}
          {worktree.ports
            .filter((p) => p.port !== worktree.devServer?.port)
            .map((p) => (
              <PortBadge key={p.port} port={p.port} active={true} />
            ))}
          <ClaudeIndicator sessions={worktree.claudeSessions} />
          <HealthBadges health={worktree.health} isMain={worktree.isMain} />
          {worktree.commitHash && (
            <span className="rounded-md border border-zinc-800/50 bg-zinc-800/30 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
              {worktree.commitHash.slice(0, 7)}
            </span>
          )}
        </div>

        {/* Log viewer */}
        {showLogs && isRunning && (
          <div className="mt-3">
            <LogViewer logs={logs} worktreePath={worktree.path} />
          </div>
        )}
      </div>
    </div>
  );
}
