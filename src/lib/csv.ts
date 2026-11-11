// CSV helpers. Cells that start with = + - @ are prefixed so spreadsheets don't run them as formulas.
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\n");

export function csvResponse(name: string, rows: unknown[][]) {
  return new Response("﻿" + toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}

/** Parses CSV text (quoted fields, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(f); f = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else f += c;
  }
  row.push(f);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
