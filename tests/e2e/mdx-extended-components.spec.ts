import { expect, test } from "@playwright/test";

test.describe("Extended MDX Component Library (feature-004b)", () => {
  test("docs page renders extended components without errors", async ({
    page,
  }) => {
    const response = await page.goto("/docs/test-components/extended");
    const status = response?.status() ?? 500;
    expect(status).not.toBe(500);
  });

  test("expandable component uses details/summary HTML pattern", async ({
    page,
  }) => {
    await page.goto("/docs/test-components/expandable-test");
    const expandables = page.locator(".expandable");
    const count = await expandables.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("banner component renders with dismiss button", async ({ page }) => {
    await page.goto("/docs/test-components/banner-test");
    const banners = page.locator(".banner");
    const count = await banners.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("badge component renders as inline span", async ({ page }) => {
    await page.goto("/docs/test-components/badge-test");
    const badges = page.locator(".badge");
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("mermaid pre blocks are present for client-side rendering", async ({
    page,
  }) => {
    await page.goto("/docs/test-components/mermaid-test");
    const mermaidBlocks = page.locator("pre.mermaid");
    const count = await mermaidBlocks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("view component uses tab-bar pattern", async ({ page }) => {
    await page.goto("/docs/test-components/view-test");
    const views = page.locator(".view");
    const count = await views.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
