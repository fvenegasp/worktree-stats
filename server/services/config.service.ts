import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AppConfig, RepoConfig, WorkspaceConfig } from "../types.js";

const CONFIG_PATH = join(import.meta.dirname, "../../config.json");

function loadConfig(): AppConfig {
  if (!existsSync(CONFIG_PATH)) {
    return { workspaces: [], repos: [] };
  }
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  // Migration: ensure workspaces array exists
  if (!raw.workspaces) raw.workspaces = [];
  return raw;
}

function saveConfig(config: AppConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// --- Workspaces ---

export function getWorkspaces(): WorkspaceConfig[] {
  return loadConfig().workspaces;
}

export function getWorkspace(id: string): WorkspaceConfig | undefined {
  return loadConfig().workspaces.find((w) => w.id === id);
}

export function addWorkspace(path: string): WorkspaceConfig {
  const config = loadConfig();
  // Check if already exists
  const existing = config.workspaces.find((w) => w.path === path);
  if (existing) return existing;

  const name = path.split("/").pop() || "workspace";
  const ws: WorkspaceConfig = { id: randomUUID(), name, path };
  config.workspaces.push(ws);
  saveConfig(config);
  return ws;
}

export function deleteWorkspace(id: string): boolean {
  const config = loadConfig();
  const len = config.workspaces.length;
  config.workspaces = config.workspaces.filter((w) => w.id !== id);
  // Also remove workspace reference from repos (but keep repos)
  for (const repo of config.repos) {
    if (repo.workspaceId === id) {
      delete repo.workspaceId;
    }
  }
  if (config.workspaces.length === len) return false;
  saveConfig(config);
  return true;
}

// --- Repos ---

export function getRepos(): RepoConfig[] {
  return loadConfig().repos;
}

export function getRepo(id: string): RepoConfig | undefined {
  return loadConfig().repos.find((r) => r.id === id);
}

export function addRepo(
  repo: Omit<RepoConfig, "id" | "name">
): RepoConfig {
  const config = loadConfig();
  const name = repo.path.split("/").pop() || "unknown";
  const newRepo: RepoConfig = {
    id: randomUUID(),
    name,
    ...repo,
  };
  config.repos.push(newRepo);
  saveConfig(config);
  return newRepo;
}

export function updateRepo(
  id: string,
  updates: Partial<Omit<RepoConfig, "id">>
): RepoConfig | null {
  const config = loadConfig();
  const idx = config.repos.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  config.repos[idx] = { ...config.repos[idx], ...updates };
  saveConfig(config);
  return config.repos[idx];
}

export function deleteRepo(id: string): boolean {
  const config = loadConfig();
  const len = config.repos.length;
  config.repos = config.repos.filter((r) => r.id !== id);
  if (config.repos.length === len) return false;
  saveConfig(config);
  return true;
}
