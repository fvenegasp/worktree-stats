import type { WorktreeHealth } from "../lib/api";

interface Props {
  health: WorktreeHealth;
  isMain: boolean;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  const days = Math.floor(seconds / 86400);
  return `${days}d`;
}

export function HealthBadges({ health, isMain }: Props) {
  const badges: JSX.Element[] = [];

  // Behind main
  if (!isMain && health.behindMain > 0) {
    badges.push(
      <span
        key="behind"
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
          health.behindMain > 10
            ? "border-red-500/25 bg-red-500/10 text-red-400"
            : "border-amber-500/25 bg-amber-500/10 text-amber-400"
        }`}
        title={`${health.behindMain} commits behind main`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {health.behindMain}
      </span>
    );
  }

  // Ahead of main
  if (!isMain && health.aheadOfMain > 0) {
    badges.push(
      <span
        key="ahead"
        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-400"
        title={`${health.aheadOfMain} commits ahead of main`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M8 13V3M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {health.aheadOfMain}
      </span>
    );
  }

  // Dirty
  if (health.isDirty) {
    badges.push(
      <span
        key="dirty"
        className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400"
        title="Uncommitted changes"
      >
        <span className="h-1 w-1 rounded-full bg-amber-400" />
        dirty
      </span>
    );
  }

  // Merged
  if (!isMain && health.isMerged) {
    badges.push(
      <span
        key="merged"
        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400"
        title="Branch merged into main — safe to delete"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        merged
      </span>
    );
  }

  // Last commit age
  if (health.lastCommitAge > 0) {
    const age = formatAge(health.lastCommitAge);
    const isStale = health.lastCommitAge > 7 * 86400; // > 7 days
    badges.push(
      <span
        key="age"
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
          isStale
            ? "border-zinc-600/30 bg-zinc-800/30 text-zinc-500"
            : "border-zinc-700/30 bg-zinc-800/20 text-zinc-500"
        }`}
        title={`Last commit: ${new Date(health.lastCommitDate).toLocaleString()}`}
      >
        {age} ago
      </span>
    );
  }

  if (badges.length === 0) return null;

  return <>{badges}</>;
}
