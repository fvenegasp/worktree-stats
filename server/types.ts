export interface WorkspaceConfig {
  id: string;
  name: string;
  path: string;
}

export interface RepoConfig {
  id: string;
  path: string;
  name: string;
  devCommand: string;
  defaultPort: number;
  portRange?: [number, number];
  workspaceId?: string;
}

export interface AppConfig {
  workspaces: WorkspaceConfig[];
  repos: RepoConfig[];
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  commitHash: string;
  isMain: boolean;
  repoId: string;
  objective: string;
  ports: PortInfo[];
  claudeSessions: ClaudeSession[];
  devServer: ProcessStatus | null;
}

export interface PortInfo {
  port: number;
  pid: number;
  command: string;
}

export interface ClaudeSession {
  pid: number;
  cwd: string;
}

export interface ProcessStatus {
  pid: number;
  port: number;
  running: boolean;
}

export interface StatusSnapshot {
  repos: RepoConfig[];
  worktrees: WorktreeInfo[];
}

export interface WsMessage {
  type: string;
  data?: unknown;
  repos?: string[];
}
