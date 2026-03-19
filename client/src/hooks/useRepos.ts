import { useState, useEffect, useCallback } from "react";
import { api, type RepoConfig, type WorkspaceConfig } from "../lib/api";

export function useRepos() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [reposData, wsData] = await Promise.all([
        api.getRepos(),
        api.getWorkspaces(),
      ]);
      setRepos(reposData);
      setWorkspaces(wsData);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { repos, workspaces, loading, error, refresh };
}
