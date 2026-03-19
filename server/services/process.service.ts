import { spawn, type ChildProcess, execSync } from "node:child_process";
import type { ProcessStatus } from "../types.js";
import { type WsBroadcast } from "../ws/handler.js";

const runningProcesses = new Map<
  string,
  { process: ChildProcess; port: number }
>();

export function startDevServer(
  wtPath: string,
  command: string,
  port: number,
  broadcast: WsBroadcast
): ProcessStatus {
  if (runningProcesses.has(wtPath)) {
    const existing = runningProcesses.get(wtPath)!;
    return { pid: existing.process.pid!, port: existing.port, running: true };
  }

  const [cmd, ...args] = command.split(" ");
  const child = spawn(cmd, args, {
    cwd: wtPath,
    env: { ...process.env, PORT: String(port) },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  runningProcesses.set(wtPath, { process: child, port });

  const handleOutput = (data: Buffer) => {
    const line = data.toString().trim();
    if (line) {
      broadcast({
        type: "process:output",
        data: { path: wtPath, line },
      });
    }
  };

  child.stdout?.on("data", handleOutput);
  child.stderr?.on("data", handleOutput);

  child.on("exit", () => {
    runningProcesses.delete(wtPath);
  });

  return { pid: child.pid!, port, running: true };
}

export function stopDevServer(wtPath: string): boolean {
  const entry = runningProcesses.get(wtPath);
  if (entry) {
    entry.process.kill("SIGTERM");
    runningProcesses.delete(wtPath);
    return true;
  }
  return false;
}

export function getProcessStatus(wtPath: string): ProcessStatus | null {
  const entry = runningProcesses.get(wtPath);
  if (!entry) return null;
  return {
    pid: entry.process.pid!,
    port: entry.port,
    running: !entry.process.killed,
  };
}

export function killAllProcesses(): void {
  for (const [path, entry] of runningProcesses) {
    try {
      entry.process.kill("SIGTERM");
    } catch {}
    runningProcesses.delete(path);
  }
}

export function getRunningPaths(): string[] {
  return Array.from(runningProcesses.keys());
}
