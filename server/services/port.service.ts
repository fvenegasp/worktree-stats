import { execSync } from "node:child_process";
import type { PortInfo, RepoConfig } from "../types.js";

export function scanListeningPorts(): PortInfo[] {
  try {
    const output = execSync("lsof -iTCP -sTCP:LISTEN -P -n -F pcn", {
      encoding: "utf-8",
      timeout: 5000,
    });

    const ports: PortInfo[] = [];
    let currentPid = 0;
    let currentCommand = "";

    for (const line of output.split("\n")) {
      if (line.startsWith("p")) {
        currentPid = parseInt(line.slice(1), 10);
      } else if (line.startsWith("c")) {
        currentCommand = line.slice(1);
      } else if (line.startsWith("n")) {
        const portMatch = line.match(/:(\d+)$/);
        if (portMatch) {
          ports.push({
            port: parseInt(portMatch[1], 10),
            pid: currentPid,
            command: currentCommand,
          });
        }
      }
    }

    // Deduplicate by port
    const seen = new Set<number>();
    return ports.filter((p) => {
      if (seen.has(p.port)) return false;
      seen.add(p.port);
      return true;
    });
  } catch {
    return [];
  }
}

export function getProcessCwd(pid: number): string | null {
  try {
    return execSync(`lsof -p ${pid} -Fn | grep '^n/' | head -1`, {
      encoding: "utf-8",
      timeout: 3000,
    })
      .trim()
      .slice(1);
  } catch {
    return null;
  }
}

export function isPortFree(port: number): boolean {
  const ports = scanListeningPorts();
  return !ports.some((p) => p.port === port);
}

export function autoAssignPort(repo: RepoConfig): number | null {
  const [min, max] = repo.portRange || [repo.defaultPort, repo.defaultPort + 9];
  const listening = new Set(scanListeningPorts().map((p) => p.port));

  for (let port = min; port <= max; port++) {
    if (!listening.has(port)) return port;
  }
  return null;
}
