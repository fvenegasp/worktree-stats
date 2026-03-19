interface Props {
  sessions: { pid: number; cwd: string }[];
}

export function ClaudeIndicator({ sessions }: Props) {
  if (sessions.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[11px] font-medium text-amber-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
      </span>
      claude
      {sessions.length > 1 && (
        <span className="text-amber-500/60">&times;{sessions.length}</span>
      )}
    </span>
  );
}
