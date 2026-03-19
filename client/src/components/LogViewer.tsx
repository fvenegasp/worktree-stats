import { useEffect, useRef } from "react";

interface Props {
  logs: { path: string; line: string }[];
  worktreePath: string;
}

export function LogViewer({ logs, worktreePath }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = logs.filter((l) => l.path === worktreePath);
  const recent = filtered.slice(-80);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [recent.length]);

  if (recent.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800/50 bg-zinc-950/60 px-3 py-4 text-center font-mono text-[10px] text-zinc-700">
        No output yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="dir-scroll max-h-48 overflow-y-auto rounded-md border border-zinc-800/50 bg-zinc-950/80 p-2"
    >
      {recent.map((log, i) => (
        <div key={i} className="font-mono text-[11px] leading-5">
          <span
            className={
              log.line.match(/error|Error|ERR|FAIL/i)
                ? "text-red-400"
                : log.line.match(/warn|WARN/i)
                ? "text-amber-400"
                : "text-zinc-500"
            }
          >
            {log.line}
          </span>
        </div>
      ))}
    </div>
  );
}
