import { expect, test } from "@playwright/test";

test.describe("Project CRUD", () => {
  test("GET /api/projects returns projects array", async ({ request }) => {
    const res = await request.get("/api/projects");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("projects");
    expect(Array.isArray(body.projects)).toBe(true);
  });

  test("POST /api/projects creates a project", async ({ request }) => {
    const name = `Test Project ${Date.now()}`;
    const res = await request.post("/api/projects", {
      data: { name },
    });
    expect([201, 401, 403]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.project).toHaveProperty("id");
      expect(body.project.name).toBe(name);
      expect(body.project.slug).toBeTruthy();
      expect(body.project.subdomain).toBeTruthy();
    }
  });

  test("POST /api/projects rejects empty name", async ({ request }) => {
    const res = await request.post("/api/projects", {
      data: { name: "" },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test("settings general page loads", async ({ page }) => {
    await page.goto("/settings/deployment/general");
    const url = page.url();
    const isSettings = url.includes("/settings/deployment/general");
    const isLogin = url.includes("/login");
    expect(isSettings || isLogin).toBe(true);
  });

  test("new project page loads", async ({ page }) => {
    await page.goto("/dashboard/new-project");
    const url = page.url();
    const isNewProject = url.includes("/new-project");
    const isLogin = url.includes("/login");
    expect(isNewProject || isLogin).toBe(true);
  });

  test("new project page shows connected repo selection and public url fallback", async ({
    page,
  }) => {
    await page.goto("/dashboard/new-project");

    const url = page.url();
    if (url.includes("/login")) {
      expect(url.includes("/login")).toBe(true);
      return;
    }

    await expect(page.getByText(/GitHub repository/i).first()).toBeVisible();
    await expect(
      page.getByRole("option", { name: /No repository selected/i }),
    ).toBeVisible();
    await expect(
      page.getByLabel(/Or paste a public GitHub repo URL/i),
    ).toBeVisible();
  });

  test("new project becomes active and settings follow the selected project", async ({
    page,
  }) => {
    const projectName = `Project QA ${Date.now()}`;

    await page.goto("/dashboard/new-project");
    await page.getByLabel(/project name/i).fill(projectName);
    await page
      .getByLabel(/Or paste a public GitHub repo URL/i)
      .fill("https://github.com/example/project-qa");
    await page.getByRole("button", { name: /create project/i }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(
      page.locator("aside button").filter({ hasText: projectName }).first(),
    ).toBeVisible();

    await page.locator("aside button").filter({ hasText: projectName }).click();
    await page.getByRole("link", { name: "QA Project" }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(
      page.locator("aside button").filter({ hasText: "QA Project" }).first(),
    ).toBeVisible();

    await page.goto("/settings/project/general");
    await expect(page.getByLabel(/project name/i)).toHaveValue("QA Project");
  });
});
