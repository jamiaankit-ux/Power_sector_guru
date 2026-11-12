"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

type F = { key: string; label: string; area?: boolean };
type Row = Record<string, string>;

/** Edits a list of items (features, testimonials, FAQs). Saved as JSON in one hidden field. */
export function ListEditor({ name, fields, initial, addLabel = "Add item" }: { name: string; fields: F[]; initial: Row[]; addLabel?: string }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const set = (i: number, k: string, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const btn = "rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div className="space-y-3 sm:col-span-2">
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => fields.some((f) => (r[f.key] ?? "").trim())))} />
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => f.area
              ? <textarea key={f.key} rows={2} value={r[f.key] ?? ""} onChange={(e) => set(i, f.key, e.target.value)} placeholder={f.label} aria-label={f.label} className="input sm:col-span-2" />
              : <input key={f.key} value={r[f.key] ?? ""} onChange={(e) => set(i, f.key, e.target.value)} placeholder={f.label} aria-label={f.label} className="input" />)}
          </div>
          <div className="mt-1 flex justify-end">
            <button type="button" className={btn} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" className={btn} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" className={`${btn} hover:text-rose-600`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={() => setRows((r) => [...r, {}])}><Plus className="h-4 w-4" />{addLabel}</button>
    </div>
  );
}
