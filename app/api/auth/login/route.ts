import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, isAuthConfigured, passwordsMatch, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isAuthConfigured() || (process.env.DASHBOARD_SESSION_SECRET?.length ?? 0) < 32) {
    return NextResponse.json({ error: "Configure DASHBOARD_PASSWORD e DASHBOARD_SESSION_SECRET (mínimo 32 caracteres) no ambiente." }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !passwordsMatch(password, process.env.DASHBOARD_PASSWORD!)) {
    return NextResponse.json({ error: "Senha incorreta. Confira e tente novamente." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(process.env.DASHBOARD_SESSION_SECRET!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
