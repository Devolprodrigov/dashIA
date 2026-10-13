import { NextRequest, NextResponse } from "next/server";
import { isAuthConfigured, isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { hasSheetsConfiguration, readConfiguredSources } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const generatedAt = new Date().toISOString();
  const liveConfigurationPresent = hasSheetsConfiguration();

  // Safe fallback: without a configured data source, the UI stays in demonstration mode.
  if (!liveConfigurationPresent) {
    return NextResponse.json({
      mode: "demo",
      authEnabled: isAuthConfigured(),
      generatedAt,
      sources: [],
      message: "Demonstração: configure as variáveis do Google Sheets para conectar os dados reais.",
    });
  }

  // Never serve private sheet data unless both password and signing secret are configured.
  if (!isAuthConfigured() || (process.env.DASHBOARD_SESSION_SECRET?.length ?? 0) < 32) {
    return NextResponse.json(
      { error: "Antes de conectar planilhas, configure DASHBOARD_PASSWORD e DASHBOARD_SESSION_SECRET (mínimo 32 caracteres)." },
      { status: 503 },
    );
  }

  if (!isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sessão expirada ou não autenticada." }, { status: 401 });
  }

  try {
    const sources = await readConfiguredSources();
    return NextResponse.json({ mode: "live", authEnabled: true, generatedAt: new Date().toISOString(), sources }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar as planilhas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
