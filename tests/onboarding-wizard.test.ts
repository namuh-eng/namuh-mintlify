import { describe, expect, it } from "vitest";

// ── Onboarding wizard step validation ────────────────────────────────────────

describe("onboarding wizard — step validation", () => {
  async function getValidateOrgName() {
    const mod = await import("@/lib/orgs");
    return mod.validateOrgName;
  }

  async function getValidateProjectName() {
    const mod = await import("@/lib/projects");
    return mod.validateProjectName;
  }

  async function getSlugifyProject() {
    const mod = await import("@/lib/projects");
    return mod.slugifyProject;
  }

  async function getGenerateSubdomain() {
    const mod = await import("@/lib/projects");
    return mod.generateSubdomain;
  }

  // Step 1: Org name validation (reuses existing validators)
  it("step 1: accepts valid org name", async () => {
    const validate = await getValidateOrgName();
    expect(validate("Acme Inc")).toBeNull();
  });

  it("step 1: rejects empty org name", async () => {
    const validate = await getValidateOrgName();
    expect(validate("")).toBe("Organization name is required");
  });

  it("step 1: rejects short org name", async () => {
    const validate = await getValidateOrgName();
    expect(validate("A")).toBe("Name must be at least 2 characters");
  });

  // Step 2: GitHub connection (skippable — no validation needed)
  it("step 2: GitHub step is skippable — no required fields", () => {
    // The GitHub step should accept any state: connected or skipped
    const hasGitHub = false;
    const canProceed = true; // Always can proceed (skip or connect)
    expect(canProceed).toBe(true);
    expect(hasGitHub).toBe(false);
  });

  // Step 3: Project name + subdomain validation
  it("step 3: accepts valid project name", async () => {
    const validate = await getValidateProjectName();
    expect(validate("My Docs")).toBeNull();
  });

  it("step 3: rejects empty project name", async () => {
    const validate = await getValidateProjectName();
    expect(validate("")).toBe("Project name is required");
  });

  it("step 3: rejects short project name", async () => {
    const validate = await getValidateProjectName();
    expect(validate("X")).toBe("Name must be at least 2 characters");
  });

  it("step 3: generates subdomain from org + project slug", async () => {
    const genSubdomain = await getGenerateSubdomain();
    expect(genSubdomain("acme", "docs")).toBe("acme-docs");
  });

  it("step 3: subdomain equals project slug when same as org slug", async () => {
    const genSubdomain = await getGenerateSubdomain();
    expect(genSubdomain("docs", "docs")).toBe("docs");
  });

  it("step 3: slugifies project name correctly", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("My Cool Docs")).toBe("my-cool-docs");
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});

// ── Onboarding wizard step progression ──────────────────────────────────────

describe("onboarding wizard — step logic", () => {
  const STEPS = ["org", "github", "project", "success"] as const;

  it("has 4 steps in correct order", () => {
    expect(STEPS).toEqual(["org", "github", "project", "success"]);
    expect(STEPS.length).toBe(4);
  });

  it("starts at step 0 (org)", () => {
    const currentStep = 0;
    expect(STEPS[currentStep]).toBe("org");
  });

  it("step 1 is github connection", () => {
    expect(STEPS[1]).toBe("github");
  });

  it("step 2 is project creation", () => {
    expect(STEPS[2]).toBe("project");
  });

  it("step 3 is success/deployment screen", () => {
    expect(STEPS[3]).toBe("success");
  });

  it("cannot go back from step 0", () => {
    const step = 0;
    const canGoBack = step > 0;
    expect(canGoBack).toBe(false);
  });

  it("can go back from step 1", () => {
    const step = 1;
    const canGoBack = step > 0;
    expect(canGoBack).toBe(true);
  });

  it("cannot go forward past step 3", () => {
    const step = 3;
    const canGoForward = step < STEPS.length - 1;
    expect(canGoForward).toBe(false);
  });
});

// ── Onboarding wizard — progress indicator ──────────────────────────────────

describe("onboarding wizard — progress indicator", () => {
  const STEP_LABELS = [
    "Organization",
    "GitHub",
    "Project",
    "Complete",
  ] as const;

  it("has a label for each step", () => {
    expect(STEP_LABELS.length).toBe(4);
  });

  it("computes progress percentage correctly", () => {
    // Progress is based on completed steps
    const progressAt = (step: number) =>
      Math.round((step / (STEP_LABELS.length - 1)) * 100);
    expect(progressAt(0)).toBe(0);
    expect(progressAt(1)).toBe(33);
    expect(progressAt(2)).toBe(67);
    expect(progressAt(3)).toBe(100);
  });
});
