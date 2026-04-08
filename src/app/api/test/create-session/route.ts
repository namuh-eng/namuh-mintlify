import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Test-only route for creating sessions in E2E tests.
// Only available when NODE_ENV=test.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.json();
  const { email, name } = body as { email: string; name: string };

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name required" },
      { status: 400 },
    );
  }

  // Use Better Auth's internal API to create a test user + session.
  // asResponse: true returns a raw Response with set-cookie headers.
  const rawResponse = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password: "test-password-e2e-only",
    },
    asResponse: true,
  });

  // Forward the set-cookie headers from Better Auth
  const responseHeaders = new Headers();
  const setCookie = rawResponse.headers.get("set-cookie");
  if (setCookie) {
    responseHeaders.set("set-cookie", setCookie);
  }

  return NextResponse.json(
    { success: true, user: { email, name } },
    { headers: responseHeaders },
  );
}
