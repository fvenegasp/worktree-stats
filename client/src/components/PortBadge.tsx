interface Props {
  port: number;
  active: boolean;
}

export function PortBadge({ port, active }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-medium tracking-tight ${
        active
          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border border-zinc-700/50 bg-zinc-800/50 text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-zinc-600"
        }`}
      />
      :{port}
    </span>
  );
}
