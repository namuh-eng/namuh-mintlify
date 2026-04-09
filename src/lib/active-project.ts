export const ACTIVE_PROJECT_STORAGE_KEY = "dashboard-active-project-id";
export const ACTIVE_PROJECT_COOKIE = "dashboard-active-project-id";

interface ProjectLike {
  id: string;
}

export function findActiveProject<T extends ProjectLike>(
  projects: T[],
  activeProjectId?: string | null,
): T | null {
  if (projects.length === 0) {
    return null;
  }

  if (!activeProjectId) {
    return projects[0];
  }

  return (
    projects.find((project) => project.id === activeProjectId) ?? projects[0]
  );
}
