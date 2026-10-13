import { google } from "googleapis";
import type { SheetCell, SheetSource, SourceData } from "@/lib/types";

const MAX_ROWS_PER_SOURCE = 1000;

// Extrai o ID da planilha automaticamente caso o usuário cole o link completo
function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Se for uma URL do Google Sheets, extrai o ID entre /d/ e a próxima barra
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Caso contrário, assume que já é o ID puro
  return trimmed;
}

function parseSources(raw: string | undefined): SheetSource[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Se não for JSON, tenta tratar o texto cru como um link único ou ID único
    const id = extractSpreadsheetId(raw);
    if (id) {
      return [{ name: "Planilha Principal", spreadsheetId: id, range: "A:Z" }];
    }
    throw new Error("SHEETS_SOURCES_JSON não contém um formato válido.");
  }
  
  if (!Array.isArray(parsed)) throw new Error("SHEETS_SOURCES_JSON precisa ser uma lista JSON.");

  return parsed.map((item, index) => {
    if (typeof item === "string") {
      // Se a lista contiver apenas strings (links ou IDs)
      const id = extractSpreadsheetId(item);
      return {
        name: `Planilha ${index + 1}`,
        spreadsheetId: id,
        range: "A:Z",
      };
    }

    if (!item || typeof item !== "object") throw new Error(`Fonte ${index + 1} inválida.`);
    const source = item as Record<string, unknown>;
    
    const rawId = String(source.spreadsheetId || source.link || source.url || "");
    const spreadsheetId = extractSpreadsheetId(rawId);
    
    if (!spreadsheetId) {
      throw new Error(`Fonte ${index + 1}: informe um link ou ID de planilha válido.`);
    }

    return {
      name: String(source.name || `Planilha ${index + 1}`).trim(),
      spreadsheetId,
      // Se não informar o intervalo, busca por "A:Z" na primeira aba automaticamente
      range: String(source.range || "A:Z").trim(),
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
    let targetRange = source.range;

    try {
      // Se o range não especificar uma aba (não tiver '!'), descobre o nome da primeira aba automaticamente
      if (!targetRange.includes("!")) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: source.spreadsheetId });
        const firstSheetName = meta.data.sheets?.[0]?.properties?.title;
        if (firstSheetName) {
          targetRange = `${firstSheetName}!${targetRange}`;
        }
      }

      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: source.spreadsheetId,
        range: targetRange,
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
      return { name: source.name, rowCount: 0, headers: [], rows: [], status: "error", error: "Não foi possível ler esta fonte. Verifique se compartilhou a planilha com a conta de serviço." };
    }
  }));
}
