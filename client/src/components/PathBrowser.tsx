import { useState, useEffect, useCallback } from "react";
import { api, type BrowseResult, type DirEntry } from "../lib/api";

interface Props {
  value: string;
  onChange: (path: string) => void;
  onSelect: (path: string) => void;
}

export function PathBrowser({ value, onChange, onSelect }: Props) {
  const [browsing, setBrowsing] = useState(false);
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateTo = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.browse(path);
      setBrowseData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (browsing && !browseData) {
      navigateTo(value || undefined);
    }
  }, [browsing, browseData, value, navigateTo]);

  const handleOpen = () => {
    setBrowsing(true);
    setBrowseData(null);
  };

  const segments = browseData
    ? browseData.path.split("/").filter(Boolean)
    : [];

  return (
    <div className="space-y-2">
      {/* Path input with browse button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/path/to/my-project"
            className="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
          />
          {value && browseData?.isGitRepo && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
              GIT
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M1.5 2.5h5l1.5 2h6.5v9h-13v-11z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Browse
        </button>
      </div>

      {/* Browser panel */}
      {browsing && (
        <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900/80 backdrop-blur">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-0.5 overflow-x-auto border-b border-zinc-800 px-3 py-2 scrollbar-none">
            <button
              onClick={() => navigateTo("/")}
              className="shrink-0 rounded px-1.5 py-0.5 font-mono text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              /
            </button>
            {segments.map((seg, i) => {
              const fullPath = "/" + segments.slice(0, i + 1).join("/");
              const isLast = i === segments.length - 1;
              return (
                <span key={fullPath} className="flex items-center gap-0.5">
                  <span className="text-zinc-700">/</span>
                  <button
                    onClick={() => navigateTo(fullPath)}
                    className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs transition-colors ${
                      isLast
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
            {loading && (
              <span className="ml-2 h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-cyan-500" />
            )}
          </div>

          {/* Status indicator bar */}
          {browseData?.isGitRepo && (
            <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-cyan-400">
                  <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.535 5.918v4.37a1.223 1.223 0 11-1.007-.02V5.862a1.224 1.224 0 01-.664-1.605L5.04 2.434l-4.74 4.74a1.03 1.03 0 000 1.456l6.988 6.988a1.03 1.03 0 001.456 0l6.953-6.953a1.031 1.031 0 000-1.378z"/>
                </svg>
                <span className="font-mono text-xs font-medium text-cyan-300">
                  Git repository
                  {browseData.hasWorktrees && " with worktrees"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange(browseData.path);
                  onSelect(browseData.path);
                  setBrowsing(false);
                }}
                className="rounded-md bg-cyan-500/20 px-3 py-1 font-mono text-xs font-bold text-cyan-400 transition-colors hover:bg-cyan-500/30"
              >
                SELECT
              </button>
            </div>
          )}
          {browseData && !browseData.isGitRepo && browseData.entries.some(e => e.isGitRepo) && (
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-emerald-400">
                  <path d="M1.5 2.5h5l1.5 2h6.5v9h-13v-11z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                <span className="font-mono text-xs font-medium text-emerald-300">
                  Workspace — {browseData.entries.filter(e => e.isGitRepo).length} repos inside
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange(browseData.path);
                  onSelect(browseData.path);
                  setBrowsing(false);
                }}
                className="rounded-md bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/30"
              >
                SELECT WORKSPACE
              </button>
            </div>
          )}

          {error && (
            <div className="border-b border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Directory listing */}
          <div className="max-h-64 overflow-y-auto">
            {browseData && browseData.path !== "/" && (
              <button
                onClick={() => navigateTo(browseData.parent)}
                className="flex w-full items-center gap-2.5 border-b border-zinc-800/50 px-3 py-2 text-left font-mono text-xs text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-zinc-600">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ..
              </button>
            )}
            {browseData?.entries.map((entry) => (
              <DirRow
                key={entry.path}
                entry={entry}
                onNavigate={navigateTo}
                onSelect={(path) => {
                  onChange(path);
                  onSelect(path);
                  setBrowsing(false);
                }}
              />
            ))}
            {browseData?.entries.length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-xs text-zinc-600">
                No subdirectories
              </div>
            )}
          </div>

          {/* Close bar */}
          <div className="border-t border-zinc-800 px-3 py-1.5 text-right">
            <button
              type="button"
              onClick={() => setBrowsing(false)}
              className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DirRow({
  entry,
  onNavigate,
  onSelect,
}: {
  entry: DirEntry;
  onNavigate: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  // Git repos: single click selects, expand arrow navigates into
  // Regular folders: single click navigates into
  const handleClick = () => {
    if (entry.isGitRepo) {
      onSelect(entry.path);
    } else {
      onNavigate(entry.path);
    }
  };

  return (
    <div className="group flex items-center border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
      <button
        onClick={handleClick}
        className="flex flex-1 items-center gap-2.5 px-3 py-2 text-left"
      >
        {entry.isGitRepo ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-cyan-500">
            <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.535 5.918v4.37a1.223 1.223 0 11-1.007-.02V5.862a1.224 1.224 0 01-.664-1.605L5.04 2.434l-4.74 4.74a1.03 1.03 0 000 1.456l6.988 6.988a1.03 1.03 0 001.456 0l6.953-6.953a1.031 1.031 0 000-1.378z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-zinc-600">
            <path d="M1.5 2.5h5l1.5 2h6.5v9h-13v-11z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        )}
        <span
          className={`font-mono text-xs ${
            entry.isGitRepo ? "font-medium text-cyan-300" : "text-zinc-400"
          }`}
        >
          {entry.name}
        </span>
        {entry.isGitRepo && (
          <span className="rounded bg-cyan-500/10 px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-cyan-500/70">
            repo
          </span>
        )}
      </button>
      {entry.isGitRepo && (
        <button
          onClick={() => onNavigate(entry.path)}
          title="Browse into this repo"
          className="mr-2 rounded px-2 py-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
