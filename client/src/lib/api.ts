const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

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

export interface WorktreeHealth {
  behindMain: number;
  aheadOfMain: number;
  isDirty: boolean;
  isMerged: boolean;
  lastCommitAge: number;
  lastCommitDate: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  commitHash: string;
  isMain: boolean;
  repoId: string;
  objective: string;
  ports: { port: number; pid: number; command: string }[];
  claudeSessions: { pid: number; cwd: string }[];
  devServer: { pid: number; port: number; running: boolean } | null;
  health: WorktreeHealth;
}

export const api = {
  getRepos: () => request<RepoConfig[]>("/repos"),

  addRepo: (data: {
    path: string;
    devCommand: string;
    defaultPort: number;
    portRange?: [number, number];
  }) =>
    request<RepoConfig>("/repos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRepo: (id: string, data: Partial<RepoConfig>) =>
    request<RepoConfig>(`/repos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRepo: (id: string) =>
    request<{ ok: boolean }>(`/repos/${id}`, { method: "DELETE" }),

  getWorktrees: (repoId: string) =>
    request<WorktreeInfo[]>(`/repos/${repoId}/worktrees`),

  createWorktree: (repoId: string, baseBranch: string, newBranch: string) =>
    request<{ path: string; branch: string }>(`/repos/${repoId}/worktrees`, {
      method: "POST",
      body: JSON.stringify({ baseBranch, newBranch }),
    }),

  deleteWorktree: (repoId: string, path: string) =>
    request<{ ok: boolean }>(`/repos/${repoId}/worktrees`, {
      method: "DELETE",
      body: JSON.stringify({ path }),
    }),

  getStatus: () =>
    request<{ worktrees: WorktreeInfo[] }>("/status"),

  startServer: (path: string, port?: number) =>
    request<{ pid: number; port: number; running: boolean }>(
      "/worktrees/start",
      { method: "POST", body: JSON.stringify({ path, port }) }
    ),

  stopServer: (path: string) =>
    request<{ ok: boolean }>("/worktrees/stop", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  browse: (path?: string) =>
    request<BrowseResult>(`/browse${path ? `?path=${encodeURIComponent(path)}` : ""}`),

  scanWorkspace: (path: string) =>
    request<WorkspaceScan>("/workspace/scan", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  registerAll: (workspacePath: string, repos: { path: string; devCommand: string; defaultPort: number }[]) =>
    request<{ workspace: WorkspaceConfig; registered: RepoConfig[]; count: number }>("/workspace/register-all", {
      method: "POST",
      body: JSON.stringify({ workspacePath, repos }),
    }),

  getWorkspaces: () => request<WorkspaceConfig[]>("/workspace"),

  deleteWorkspace: (id: string) =>
    request<{ ok: boolean }>(`/workspace/${id}`, { method: "DELETE" }),
};

export interface BrowseResult {
  path: string;
  parent: string;
  isGitRepo: boolean;
  hasWorktrees: boolean;
  entries: DirEntry[];
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
  isSymlink: boolean;
}

export interface WorkspaceScan {
  path: string;
  repos: ScannedRepo[];
}

export interface ScannedRepo {
  name: string;
  path: string;
  alreadyRegistered: boolean;
}
