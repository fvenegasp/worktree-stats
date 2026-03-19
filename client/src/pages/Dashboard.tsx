import { useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useRepos } from "../hooks/useRepos";
import { WorktreeCard } from "../components/WorktreeCard";
import { CreateWorktreeModal } from "../components/CreateWorktreeModal";
import { RepoRegistration } from "../components/RepoRegistration";
import { api, type RepoConfig, type WorkspaceConfig } from "../lib/api";

export function Dashboard() {
  const { worktrees, connected, logs } = useWebSocket();
  const { repos, workspaces, refresh } = useRepos();
  const [createForRepo, setCreateForRepo] = useState<RepoConfig | null>(null);
  const [deletingRepo, setDeletingRepo] = useState<string | null>(null);

  const totalWorktrees = worktrees.length;
  const runningServers = worktrees.filter((wt) => wt.devServer?.running).length;
  const activeClaude = worktrees.reduce(
    (sum, wt) => sum + wt.claudeSessions.length,
    0
  );

  // Group repos by workspace
  const wsGroups = buildWorkspaceGroups(workspaces, repos, worktrees);

  const handleDeleteRepo = async (repoId: string) => {
    if (!confirm("Remove this repository from monitoring?")) return;
    setDeletingRepo(repoId);
    try {
      await api.deleteRepo(repoId);
      refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingRepo(null);
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    if (!confirm("Remove this workspace and unlink all its repos?")) return;
    try {
      // Delete all repos in this workspace
      const wsRepos = repos.filter((r) => r.workspaceId === wsId);
      for (const repo of wsRepos) {
        await api.deleteRepo(repo.id);
      }
      await api.deleteWorkspace(wsId);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">
                Worktree Stats
              </h1>
              <p className="mt-1 text-sm font-light text-zinc-600">
                Monitor &amp; manage your git worktrees
              </p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                connected
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                  : "border-red-500/20 bg-red-500/5 text-red-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {connected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    connected ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </span>
              {connected ? "LIVE" : "OFFLINE"}
            </div>
          </div>

          {/* Stats bar */}
          {repos.length > 0 && (
            <div className="mt-6 flex gap-6">
              <Stat label="Workspaces" value={workspaces.length} />
              <Stat label="Repos" value={repos.length} />
              <Stat label="Worktrees" value={totalWorktrees} />
              <Stat
                label="Running"
                value={runningServers}
                accent={runningServers > 0 ? "emerald" : undefined}
              />
              <Stat
                label="Claude"
                value={activeClaude}
                accent={activeClaude > 0 ? "amber" : undefined}
              />
            </div>
          )}
        </header>

        {/* Workspace sections */}
        <div className="space-y-12">
          {wsGroups.map((group) => (
            <section key={group.workspace?.id || "ungrouped"}>
              {/* Workspace header */}
              {group.workspace && (
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="text-violet-400"
                        >
                          <path
                            d="M1.5 2.5h5l1.5 2h6.5v9h-13v-11z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-100">
                          {group.workspace.name}
                        </h2>
                        <p className="font-mono text-[10px] text-zinc-600">
                          {group.workspace.path.replace(
                            /^\/Users\/[^/]+\//,
                            "~/"
                          )}
                        </p>
                      </div>
                      <span className="rounded-md bg-zinc-800/60 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                        {group.repos.length} repos
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteWorkspace(group.workspace!.id)
                      }
                      className="rounded-md p-1.5 text-zinc-700 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Remove workspace"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 h-px bg-gradient-to-r from-violet-500/20 via-zinc-800/40 to-transparent" />
                </div>
              )}

              {/* Repos inside workspace */}
              <div className="space-y-8">
                {group.repos.map(({ repo, worktrees: repoWorktrees }) => (
                  <div
                    key={repo.id}
                    className={group.workspace ? "ml-4 pl-4 border-l border-zinc-800/40" : ""}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="text-cyan-400"
                          >
                            <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.535 5.918v4.37a1.223 1.223 0 11-1.007-.02V5.862a1.224 1.224 0 01-.664-1.605L5.04 2.434l-4.74 4.74a1.03 1.03 0 000 1.456l6.988 6.988a1.03 1.03 0 001.456 0l6.953-6.953a1.031 1.031 0 000-1.378z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-200">
                          {repo.name}
                        </h3>
                        <span className="rounded-md bg-zinc-800/60 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
                          {repoWorktrees.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCreateForRepo(repo)}
                          className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-800/40 px-3 py-1.5 font-mono text-[11px] font-medium text-zinc-400 transition-all hover:border-cyan-500/30 hover:text-cyan-400"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M8 3v10M3 8h10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          Worktree
                        </button>
                        {!group.workspace && (
                          <button
                            onClick={() => handleDeleteRepo(repo.id)}
                            disabled={deletingRepo === repo.id}
                            className="rounded-md p-1.5 text-zinc-700 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            title="Remove repo"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M4 4l8 8M12 4l-8 8"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {repoWorktrees.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {repoWorktrees.map((wt) => (
                          <WorktreeCard
                            key={wt.path}
                            worktree={wt}
                            repoName={repo.name}
                            logs={logs}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-zinc-800/60 py-6 text-center">
                        <p className="font-mono text-xs text-zinc-700">
                          No worktrees detected
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Empty state */}
        {repos.length === 0 && (
          <div className="mb-8 flex flex-col items-center rounded-xl border border-dashed border-zinc-800/60 py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50">
              <svg
                width="24"
                height="24"
                viewBox="0 0 16 16"
                fill="none"
                className="text-zinc-600"
              >
                <path
                  d="M1.5 2.5h5l1.5 2h6.5v9h-13v-11z"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">No workspaces registered</p>
            <p className="mt-1 text-xs text-zinc-700">
              Add a workspace directory to start monitoring all repos inside
            </p>
          </div>
        )}

        {/* Add workspace */}
        <div className="mt-8">
          <RepoRegistration onAdded={refresh} />
        </div>

        {/* Modal */}
        {createForRepo && (
          <CreateWorktreeModal
            repo={createForRepo}
            onClose={() => setCreateForRepo(null)}
            onCreated={refresh}
          />
        )}
      </div>
    </div>
  );
}

interface WorkspaceGroup {
  workspace: WorkspaceConfig | null;
  repos: { repo: RepoConfig; worktrees: import("../lib/api").WorktreeInfo[] }[];
}

function buildWorkspaceGroups(
  workspaces: WorkspaceConfig[],
  repos: RepoConfig[],
  worktrees: import("../lib/api").WorktreeInfo[]
): WorkspaceGroup[] {
  const groups: WorkspaceGroup[] = [];

  // Group repos by workspace
  for (const ws of workspaces) {
    const wsRepos = repos
      .filter((r) => r.workspaceId === ws.id)
      .map((repo) => ({
        repo,
        worktrees: worktrees.filter((wt) => wt.repoId === repo.id),
      }));

    if (wsRepos.length > 0) {
      groups.push({ workspace: ws, repos: wsRepos });
    }
  }

  // Ungrouped repos (no workspace)
  const ungrouped = repos
    .filter((r) => !r.workspaceId)
    .map((repo) => ({
      repo,
      worktrees: worktrees.filter((wt) => wt.repoId === repo.id),
    }));

  if (ungrouped.length > 0) {
    groups.push({ workspace: null, repos: ungrouped });
  }

  return groups;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-mono text-lg font-bold tabular-nums ${
          accent ? colorMap[accent] : "text-zinc-300"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </span>
    </div>
  );
}
