import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, back }),
}));

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("dashboard new project page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
    refresh.mockClear();
    back.mockClear();
    document.body.innerHTML = "";
    document.cookie = "";
    localStorage.clear();
  });

  it("creates repo-backed projects with initial deployment and provisions docs before dashboard navigation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ connections: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: "project-1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provisioning: {
            mode: "github_import",
            source: "public",
            importedPageCount: 2,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { default: NewProjectPage } = await import(
      "@/app/dashboard/new-project/page"
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<NewProjectPage />);
    });

    await act(async () => {
      container
        .querySelector<HTMLInputElement>("#project-name")
        ?.setRangeText("Imported Docs");
      container
        .querySelector<HTMLInputElement>("#project-name")
        ?.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector<HTMLInputElement>("#public-repo-url")
        ?.setRangeText("https://github.com/acme/docs");
      container
        .querySelector<HTMLInputElement>("#public-repo-url")
        ?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      container.querySelector<HTMLFormElement>("form")?.requestSubmit();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Imported Docs",
        repoUrl: "https://github.com/acme/docs",
        createInitialDeployment: true,
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/onboarding/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "project-1" }),
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
