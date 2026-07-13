import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthScreen } from "@/components/auth/auth-screen";

describe("AuthScreen", () => {
  it("renders login with email/password and social options", () => {
    const html = renderToStaticMarkup(
      <AuthScreen callbackURL="/dashboard" mode="login" />,
    );

    expect(html).toContain("Welcome");
    expect(html).toContain("back.");
    expect(html).toContain("Docs you ship like product.");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("GitHub");
    expect(html).toContain("SSO");
    expect(html).toContain("Or with email");
    expect(html).toContain("Work email");
    expect(html).toContain("Password");
    expect(html).toContain("Continue →");
    expect(html).toContain("magic link");
  });

  it("renders signup with reachable email/password fields", () => {
    const html = renderToStaticMarkup(
      <AuthScreen callbackURL="/onboarding" mode="signup" />,
    );

    expect(html).toContain("Make your docs");
    expect(html).toContain("matter.");
    expect(html).toContain("An AI-native docs platform");
    expect(html).toContain("Free · No credit card");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Your name");
    expect(html).toContain("Work email");
    expect(html).toContain("Create workspace");
    expect(html).toContain("Privacy Policy");
  });

  it("clearly disables Google when OAuth credentials are missing", () => {
    const html = renderToStaticMarkup(
      <AuthScreen
        callbackURL="/onboarding"
        googleAuthEnabled={false}
        mode="signup"
      />,
    );

    expect(html).toContain("Google sign-in unavailable");
    expect(html).toContain(
      "Google OAuth credentials are not configured for this deployment.",
    );
    expect(html).toContain("Work email");
    expect(html).toContain("Create workspace");
  });

  it("uses exactly one h1 per screen for accessibility and e2e stability", () => {
    for (const mode of ["login", "signup"] as const) {
      const html = renderToStaticMarkup(
        <AuthScreen callbackURL="/dashboard" mode={mode} />,
      );
      expect(html.match(/<h1/g)).toHaveLength(1);
    }
  });
});
