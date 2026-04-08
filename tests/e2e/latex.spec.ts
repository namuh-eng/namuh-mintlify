import { expect, test } from "@playwright/test";

test.describe("LaTeX Math Rendering", () => {
  test("renders inline math expressions on docs pages", async ({ page }) => {
    // Create a project with latex enabled and a page with math content
    const res = await page.request.post("/api/test/seed-latex");
    const { subdomain, pagePath } = await res.json();

    await page.goto(`/docs/${subdomain}/${pagePath}`);

    // KaTeX stylesheet should be loaded
    const katexLink = page.locator('link[href*="katex"]');
    await expect(katexLink).toBeAttached();

    // Inline math should render as KaTeX spans
    const katexSpans = page.locator(".katex");
    await expect(katexSpans.first()).toBeVisible();
  });

  test("renders block math equations centered", async ({ page }) => {
    const res = await page.request.post("/api/test/seed-latex");
    const { subdomain, pagePath } = await res.json();

    await page.goto(`/docs/${subdomain}/${pagePath}`);

    // Block math should have display class
    const displayMath = page.locator(".katex-display");
    await expect(displayMath.first()).toBeVisible();
  });

  test("does not load KaTeX CSS when latex is disabled", async ({ page }) => {
    // Use a project without latex enabled
    const res = await page.request.post("/api/test/seed-latex?latex=false");
    const { subdomain, pagePath } = await res.json();

    await page.goto(`/docs/${subdomain}/${pagePath}`);

    // KaTeX stylesheet should NOT be present
    const katexLink = page.locator('link[href*="katex"]');
    await expect(katexLink).toHaveCount(0);
  });

  test("preserves math inside code blocks", async ({ page }) => {
    const res = await page.request.post("/api/test/seed-latex");
    const { subdomain, pagePath } = await res.json();

    await page.goto(`/docs/${subdomain}/${pagePath}`);

    // Code blocks should still contain dollar signs, not KaTeX
    const codeBlocks = page.locator("code");
    const codeCount = await codeBlocks.count();
    for (let i = 0; i < codeCount; i++) {
      const text = await codeBlocks.nth(i).textContent();
      if (text?.includes("$")) {
        // Dollar signs in code should be raw, not rendered as KaTeX
        const hasKatex = await codeBlocks.nth(i).locator(".katex").count();
        expect(hasKatex).toBe(0);
      }
    }
  });

  test("renders complex LaTeX expressions", async ({ page }) => {
    const res = await page.request.post("/api/test/seed-latex");
    const { subdomain, pagePath } = await res.json();

    await page.goto(`/docs/${subdomain}/${pagePath}`);

    // Should have both inline and block math rendered
    const allKatex = page.locator(".katex");
    const count = await allKatex.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
