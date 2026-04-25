"use client";

import { useCallback, useState } from "react";

interface UpdateProjectOptions<T> {
  projectId?: string;
  setProject: (project: T) => void;
}

export function useProjectUpdater<T>({
  projectId,
  setProject,
}: UpdateProjectOptions<T>) {
  const [saving, setSaving] = useState(false);

  const updateProject = useCallback(
    async (body: Record<string, unknown>) => {
      if (!projectId) {
        return { ok: false as const, error: "No project found" };
      }

      setSaving(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            ok: false as const,
            error: data.error || "Failed to save",
            data,
          };
        }

        setProject(data.project);
        return { ok: true as const, data };
      } catch {
        return {
          ok: false as const,
          error: "Something went wrong",
        };
      } finally {
        setSaving(false);
      }
    },
    [projectId, setProject],
  );

  return {
    saving,
    updateProject,
  };
}
