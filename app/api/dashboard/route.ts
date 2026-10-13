import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { hasSheetsConfiguration, readConfiguredSources } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const generatedAt = new Date().toISOString();
  const liveConfigurationPresent = hasSheetsConfiguration();

  // Se as variáveis do Google Sheets não estiverem configuradas, exibe o modo demonstração suavemente
  if (!liveConfigurationPresent) {
    return NextResponse.json({
      mode: "demo",
      authEnabled: false,
      generatedAt,
      sources: [],
      message: "Demonstração: configure as variáveis do Google Sheets para conectar os dados reais.",
    });
  }

  try {
    const sources = await readConfiguredSources();
    return NextResponse.json(
      {
        mode: "live",
        authEnabled: false,
        generatedAt: new Date().toISOString(),
        sources,
      },
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar as planilhas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
