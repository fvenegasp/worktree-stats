import { useState } from "react";
import { api, type RepoConfig } from "../lib/api";

interface Props {
  repo: RepoConfig;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWorktreeModal({ repo, onClose, onCreated }: Props) {
  const [baseBranch, setBaseBranch] = useState("main");
  const [newBranch, setNewBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.createWorktree(repo.id, baseBranch, newBranch);
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-900/95 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            New Worktree
          </h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-600">
            {repo.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Base Branch
            </label>
            <input
              type="text"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              New Branch
            </label>
            <input
              type="text"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              placeholder="feat/123-my-feature"
              className="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newBranch.trim()}
              className="rounded-md bg-cyan-500/15 px-4 py-2 font-mono text-sm font-semibold text-cyan-400 transition-all hover:bg-cyan-500/25 disabled:opacity-40"
            >
              {loading ? "Creating..." : "Create Worktree"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
