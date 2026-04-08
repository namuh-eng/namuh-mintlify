import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/docs/test-project/quickstart",
}));

describe("Docs site layout — feature-014", () => {
  describe("ThemeProvider", () => {
    it("defaults to dark theme", async () => {
      const { getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      // localStorage empty → should default to "dark"
      expect(getThemeFromStorage()).toBe("dark");
    });

    it("persists theme choice to localStorage", async () => {
      const { setThemeInStorage, getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      setThemeInStorage("light");
      expect(getThemeFromStorage()).toBe("light");
      setThemeInStorage("dark");
      expect(getThemeFromStorage()).toBe("dark");
    });

    it("validates theme values (rejects invalid values)", async () => {
      const { getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      localStorage.setItem("docs-theme", "invalid-value");
      expect(getThemeFromStorage()).toBe("dark");
    });
  });

  describe("SearchModal", () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it("exports SearchModal component", async () => {
      const mod = await import("@/components/docs/search-modal");
      expect(mod.SearchModal).toBeDefined();
      expect(typeof mod.SearchModal).toBe("function");
    });

    it("opens on Cmd+K / Ctrl+K keyboard shortcut", async () => {
      const { handleSearchShortcut } = await import(
        "@/components/docs/search-modal"
      );
      // Simulate Cmd+K
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      });
      const result = handleSearchShortcut(event);
      expect(result).toBe(true); // should signal to open modal
    });

    it("does NOT open on just K key without modifier", async () => {
      const { handleSearchShortcut } = await import(
        "@/components/docs/search-modal"
      );
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: false,
        ctrlKey: false,
        bubbles: true,
      });
      const result = handleSearchShortcut(event);
      expect(result).toBe(false);
    });

    it("filters pages by search query", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [
        { path: "quickstart", title: "Quickstart" },
        { path: "essentials/markdown", title: "Markdown Basics" },
        { path: "essentials/code", title: "Code Blocks" },
        { path: "api-reference/intro", title: "API Reference" },
      ];
      const results = filterPages(pages, "markdown");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Markdown Basics");
    });

    it("returns all pages on empty query", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [
        { path: "quickstart", title: "Quickstart" },
        { path: "essentials/markdown", title: "Markdown Basics" },
      ];
      const results = filterPages(pages, "");
      expect(results).toHaveLength(2);
    });

    it("search is case-insensitive", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [{ path: "quickstart", title: "Quickstart Guide" }];
      expect(filterPages(pages, "QUICK")).toHaveLength(1);
      expect(filterPages(pages, "quick")).toHaveLength(1);
    });
  });

  describe("MobileNav", () => {
    it("exports MobileMenuButton component", async () => {
      const mod = await import("@/components/docs/mobile-nav");
      expect(mod.MobileMenuButton).toBeDefined();
    });

    it("exports MobileSidebar component", async () => {
      const mod = await import("@/components/docs/mobile-nav");
      expect(mod.MobileSidebar).toBeDefined();
    });
  });

  describe("Layout structure", () => {
    it("TOC width constant is 240px per spec", async () => {
      const { LAYOUT_WIDTHS } = await import(
        "@/components/docs/layout-constants"
      );
      expect(LAYOUT_WIDTHS.sidebar).toBe(260);
      expect(LAYOUT_WIDTHS.toc).toBe(240);
      expect(LAYOUT_WIDTHS.maxContent).toBe(1440);
    });
  });
});
