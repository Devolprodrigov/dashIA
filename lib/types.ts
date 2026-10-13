export type SheetCell = string | number | boolean | null;

export type SheetSource = {
  name: string;
  spreadsheetId: string;
  range: string;
};

export type SourceData = {
  name: string;
  rowCount: number;
  headers: string[];
  rows: Record<string, SheetCell>[];
  status: "ok" | "error";
  error?: string;
};

export type DashboardPayload = {
  mode: "demo" | "live";
  authEnabled?: boolean;
  generatedAt: string;
  sources: SourceData[];
  message?: string;
};
