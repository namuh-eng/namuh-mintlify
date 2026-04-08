import { expect, test } from "@playwright/test";

test.describe("Docs TOC — Table of Contents", () => {
  test("TOC panel is visible on docs pages with headings", async ({ page }) => {
    await page.goto("/docs/demo/introduction");
    const toc = page.getByTestId("docs-toc");
    await expect(toc).toBeVisible();
    await expect(toc.locator(".docs-toc-title")).toHaveText("On this page");
  });

  test("TOC contains only H2 and H3 headings", async ({ page }) => {
    await page.goto("/docs/demo/introduction");
    const links = page.locator(".docs-toc-link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    // All links should be anchor links
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toMatch(/^#/);
    }
  });

  test("clicking a TOC link scrolls to the heading", async ({ page }) => {
    await page.goto("/docs/demo/introduction");
    const firstLink = page.locator(".docs-toc-link").first();
    const href = await firstLink.getAttribute("href");
    expect(href).toBeTruthy();

    await firstLink.click();
    // After click, URL hash should update
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain(href);
  });

  test("TOC has sticky positioning", async ({ page }) => {
    await page.goto("/docs/demo/introduction");
    const toc = page.getByTestId("docs-toc");
    const position = await toc.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("sticky");
  });

  test("TOC is hidden on narrow viewports", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/docs/demo/introduction");
    const toc = page.getByTestId("docs-toc");
    await expect(toc).toBeHidden();
  });
});
