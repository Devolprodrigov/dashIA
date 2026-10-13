import { google } from "googleapis";
import type { SheetCell, SheetSource, SourceData } from "@/lib/types";

const MAX_ROWS_PER_SOURCE = 1000;

function parseSources(raw: string | undefined): SheetSource[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SHEETS_SOURCES_JSON não contém um JSON válido.");
  }
  if (!Array.isArray(parsed)) throw new Error("SHEETS_SOURCES_JSON precisa ser uma lista JSON.");

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Fonte ${index + 1} inválida.`);
    const source = item as Record<string, unknown>;
    if (typeof source.name !== "string" || typeof source.spreadsheetId !== "string" || typeof source.range !== "string") {
      throw new Error(`Fonte ${index + 1}: informe name, spreadsheetId e range.`);
    }
    return {
      name: source.name.trim(),
      spreadsheetId: source.spreadsheetId.trim(),
      range: source.range.trim(),
    };
  });
}

export function getConfiguredSources(): SheetSource[] {
  return parseSources(process.env.SHEETS_SOURCES_JSON);
}

export function hasSheetsConfiguration(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.SHEETS_SOURCES_JSON,
  );
}

function headerNames(values: unknown[]): string[] {
  const seen = new Map<string, number>();
  return values.map((value, index) => {
    const original = String(value ?? "").trim();
    const base = original || `Coluna ${index + 1}`;
    const amount = (seen.get(base) ?? 0) + 1;
    seen.set(base, amount);
    return amount === 1 ? base : `${base} (${amount})`;
  });
}

function normaliseCell(value: unknown): SheetCell {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value === null || value === undefined) return null;
  return String(value);
}

export async function readConfiguredSources(): Promise<SourceData[]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("Credenciais da conta de serviço não configuradas.");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sources = getConfiguredSources();
  if (sources.length === 0) throw new Error("Nenhuma fonte foi definida em SHEETS_SOURCES_JSON.");

  return Promise.all(sources.map(async (source): Promise<SourceData> => {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: source.spreadsheetId,
        range: source.range,
        majorDimension: "ROWS",
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      const values = result.data.values ?? [];
      if (values.length === 0) {
        return { name: source.name, rowCount: 0, headers: [], rows: [], status: "ok" };
      }
      const headers = headerNames(values[0] as unknown[]);
      const rows = values.slice(1, MAX_ROWS_PER_SOURCE + 1).map((row) => {
        const cells = row as unknown[];
        return Object.fromEntries(headers.map((header, index) => [header, normaliseCell(cells[index])]));
      });
      return { name: source.name, rowCount: Math.max(0, values.length - 1), headers, rows, status: "ok" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao ler a planilha.";
      console.error(`[Google Sheets] Fonte "${source.name}":`, message);
      return { name: source.name, rowCount: 0, headers: [], rows: [], status: "error", error: "Não foi possível ler esta fonte. Confira o ID, intervalo e permissões." };
    }
  }));
}
