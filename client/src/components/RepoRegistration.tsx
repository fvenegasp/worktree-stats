import { useState } from "react";
import { api, type ScannedRepo } from "../lib/api";
import { PathBrowser } from "./PathBrowser";

interface Props {
  onAdded: () => void;
}

// Known dev commands per project type
const KNOWN_COMMANDS: Record<string, string> = {
  "agrocheck-back": "npm run start:dev",
  "agrocheck-front": "npm run dev",
  "agrocheck-app": "npm run dev",
};

const BASE_PORTS: Record<string, number> = {
  "agrocheck-back": 3001,
  "agrocheck-front": 3010,
  "agrocheck-app": 3020,
};

let nextAutoPort = 3030;

function guessDevCommand(name: string): string {
  return KNOWN_COMMANDS[name] || "npm run dev";
}

function guessPort(name: string): number {
  if (BASE_PORTS[name]) return BASE_PORTS[name];
  const port = nextAutoPort;
  nextAutoPort += 10;
  return port;
}

export function RepoRegistration({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [wsPath, setWsPath] = useState("");
  const [scanned, setScanned] = useState<ScannedRepo[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<
    Map<string, { devCommand: string; defaultPort: number }>
  >(new Map());
  const [scanning, setScanning] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRepo, setEditingRepo] = useState<string | null>(null);

  const handleScan = async (pathOverride?: string) => {
    const scanPath = pathOverride || wsPath;
    if (!scanPath) return;
    setScanning(true);
    setError(null);
    try {
      const data = await api.scanWorkspace(scanPath);
      setScanned(data.repos);

      // Auto-select unregistered repos, auto-configure
      const sel = new Set<string>();
      const cfgs = new Map<string, { devCommand: string; defaultPort: number }>();
      for (const repo of data.repos) {
        if (!repo.alreadyRegistered) {
          sel.add(repo.path);
        }
        cfgs.set(repo.path, {
          devCommand: guessDevCommand(repo.name),
          defaultPort: guessPort(repo.name),
        });
      }
      setSelected(sel);
      setConfigs(cfgs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleRegister = async () => {
    const repos = Array.from(selected).map((path) => {
      const cfg = configs.get(path)!;
      return { path, devCommand: cfg.devCommand, defaultPort: cfg.defaultPort };
    });
    if (repos.length === 0) return;

    setRegistering(true);
    setError(null);
    try {
      await api.registerAll(wsPath, repos);
      setOpen(false);
      setScanned(null);
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegistering(false);
    }
  };

  const toggleRepo = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const updateConfig = (
    path: string,
    field: "devCommand" | "defaultPort",
    value: string
  ) => {
    setConfigs((prev) => {
      const next = new Map(prev);
      const current = next.get(path)!;
      next.set(path, {
        ...current,
        [field]: field === "defaultPort" ? parseInt(value, 10) || 0 : value,
      });
      return next;
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 py-4 text-sm text-zinc-600 transition-all hover:border-cyan-500/30 hover:text-cyan-400"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform group-hover:scale-110"
        >
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add Workspace
      </button>
    );
  }

  const newRepoCount = scanned
    ? scanned.filter((r) => !r.alreadyRegistered && selected.has(r.path)).length
    : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-900/60 backdrop-blur">
      <div className="border-b border-zinc-800/60 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-200">
          Add Workspace
        </h3>
        <p className="mt-0.5 text-xs text-zinc-600">
          Browse to a directory that contains your git repos — all repos inside
          will be detected
        </p>
      </div>

      <div className="space-y-4 p-5">
        {/* Path browser */}
        <div>
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Workspace Directory
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <PathBrowser
                value={wsPath}
                onChange={setWsPath}
                onSelect={(path) => {
                  setWsPath(path);
                  setScanned(null);
                  // Auto-scan when selecting a workspace
                  handleScan(path);
                }}
              />
            </div>
          </div>
          {wsPath && !scanned && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="mt-2 flex items-center gap-2 rounded-md bg-cyan-500/15 px-4 py-2 font-mono text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500/25 disabled:opacity-40"
            >
              {scanning ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
                  Scanning...
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <circle
                      cx="7"
                      cy="7"
                      r="4.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M10.5 10.5L14 14"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Scan for Repos
                </>
              )}
            </button>
          )}
        </div>

        {/* Scanned repos list */}
        {scanned && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {scanned.length} Repos Found
              </span>
              {scanned.filter((r) => !r.alreadyRegistered).length > 0 && (
                <button
                  onClick={() => {
                    const allNew = scanned
                      .filter((r) => !r.alreadyRegistered)
                      .map((r) => r.path);
                    const allSelected = allNew.every((p) => selected.has(p));
                    setSelected((prev) => {
                      const next = new Set(prev);
                      for (const p of allNew) {
                        if (allSelected) next.delete(p);
                        else next.add(p);
                      }
                      return next;
                    });
                  }}
                  className="font-mono text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Toggle all
                </button>
              )}
            </div>

            <div className="space-y-1 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2">
              {scanned.map((repo) => {
                const cfg = configs.get(repo.path);
                const isSelected = selected.has(repo.path);
                const isEditing = editingRepo === repo.path;

                return (
                  <div key={repo.path}>
                    <div
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        repo.alreadyRegistered
                          ? "opacity-40"
                          : isSelected
                          ? "bg-cyan-500/5"
                          : "hover:bg-zinc-800/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() =>
                          !repo.alreadyRegistered && toggleRepo(repo.path)
                        }
                        disabled={repo.alreadyRegistered}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          repo.alreadyRegistered
                            ? "border-zinc-700 bg-zinc-800"
                            : isSelected
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-zinc-600 hover:border-zinc-400"
                        }`}
                      >
                        {(isSelected || repo.alreadyRegistered) && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M3.5 8.5l3 3 6-7"
                              stroke={
                                repo.alreadyRegistered ? "#52525b" : "#0c0c0e"
                              }
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Git icon */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className={
                          repo.alreadyRegistered
                            ? "text-zinc-600"
                            : "text-cyan-500"
                        }
                      >
                        <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.535 5.918v4.37a1.223 1.223 0 11-1.007-.02V5.862a1.224 1.224 0 01-.664-1.605L5.04 2.434l-4.74 4.74a1.03 1.03 0 000 1.456l6.988 6.988a1.03 1.03 0 001.456 0l6.953-6.953a1.031 1.031 0 000-1.378z" />
                      </svg>

                      {/* Repo info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs font-medium text-zinc-200">
                            {repo.name}
                          </span>
                          {repo.alreadyRegistered && (
                            <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                              REGISTERED
                            </span>
                          )}
                        </div>
                        {cfg && !repo.alreadyRegistered && (
                          <span className="font-mono text-[10px] text-zinc-600">
                            {cfg.devCommand} — :{cfg.defaultPort}
                          </span>
                        )}
                      </div>

                      {/* Edit config button */}
                      {!repo.alreadyRegistered && isSelected && (
                        <button
                          onClick={() =>
                            setEditingRepo(isEditing ? null : repo.path)
                          }
                          className={`shrink-0 rounded p-1 text-zinc-600 transition-colors hover:text-zinc-300 ${
                            isEditing ? "bg-zinc-800 text-zinc-300" : ""
                          }`}
                          title="Configure"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M8 10a2 2 0 100-4 2 2 0 000 4z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M13.5 8a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Inline config editor */}
                    {isEditing && cfg && (
                      <div className="ml-10 mt-1 mb-2 grid grid-cols-2 gap-2 rounded-md border border-zinc-800/50 bg-zinc-900/80 p-3">
                        <div>
                          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                            Dev Command
                          </label>
                          <input
                            type="text"
                            value={cfg.devCommand}
                            onChange={(e) =>
                              updateConfig(
                                repo.path,
                                "devCommand",
                                e.target.value
                              )
                            }
                            className="w-full rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-1.5 font-mono text-[11px] text-zinc-200 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                            Base Port
                          </label>
                          <input
                            type="number"
                            value={cfg.defaultPort}
                            onChange={(e) =>
                              updateConfig(
                                repo.path,
                                "defaultPort",
                                e.target.value
                              )
                            }
                            className="w-full rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-1.5 font-mono text-[11px] text-zinc-200 focus:border-cyan-500/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 px-5 py-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setScanned(null);
          }}
          className="rounded-md px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Cancel
        </button>
        {scanned && newRepoCount > 0 && (
          <button
            onClick={handleRegister}
            disabled={registering}
            className="flex items-center gap-2 rounded-md bg-cyan-500/15 px-4 py-2 font-mono text-sm font-semibold text-cyan-400 transition-all hover:bg-cyan-500/25 disabled:opacity-40"
          >
            {registering ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
                Registering...
              </>
            ) : (
              <>
                Register {newRepoCount} Repo{newRepoCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
