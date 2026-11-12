"use client";
import { useRef, useState } from "react";
import { Bold, Eye, Heading2, Image as ImageIcon, Italic, Link2, List, Loader2, Pencil, Quote, Table } from "lucide-react";
import { markdown } from "@/lib/markdown";

/** Writing box with a formatting toolbar, picture upload and live preview. Content is saved as Markdown. */
export function MarkdownEditor({ name, defaultValue, rows = 14 }: { name: string; defaultValue: string; rows?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  function wrap(before: string, after = "", placeholder = "text") {
    const el = ta.current; if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b) || placeholder;
    const next = value.slice(0, a) + before + sel + after + value.slice(b);
    setValue(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length); });
  }
  const line = (prefix: string) => wrap((value && !value.endsWith("\n") && ta.current?.selectionStart === value.length ? "\n" : "") + prefix, "", "text");

  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) wrap(f.type.startsWith("image/") ? `\n![${f.name.replace(/\.[^.]+$/, "")}](${d.url})\n` : `[${f.name}](${d.url})`, "", "");
      else alert(d.error || "Upload failed");
    } finally { setBusy(false); }
  }

  const b = "rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/50">
        <button type="button" className={b} title="Heading" onClick={() => line("## ")}><Heading2 className="h-4 w-4" /></button>
        <button type="button" className={b} title="Bold" onClick={() => wrap("**", "**")}><Bold className="h-4 w-4" /></button>
        <button type="button" className={b} title="Italic" onClick={() => wrap("*", "*")}><Italic className="h-4 w-4" /></button>
        <button type="button" className={b} title="Bullet list" onClick={() => line("- ")}><List className="h-4 w-4" /></button>
        <button type="button" className={b} title="Key takeaway box" onClick={() => line("> ")}><Quote className="h-4 w-4" /></button>
        <button type="button" className={b} title="Link" onClick={() => wrap("[", "](https://)")}><Link2 className="h-4 w-4" /></button>
        <button type="button" className={b} title="Table" onClick={() => wrap("\n| Column A | Column B |\n| --- | --- |\n| ", " | value |\n", "value")}><Table className="h-4 w-4" /></button>
        <button type="button" className={b} title="Upload a picture or file" onClick={() => file.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}</button>
        <input ref={file} type="file" hidden accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" className={`${b} ml-auto flex items-center gap-1.5 text-xs font-semibold`} onClick={() => setPreview((p) => !p)}>{preview ? <><Pencil className="h-4 w-4" />Edit</> : <><Eye className="h-4 w-4" />Preview</>}</button>
      </div>
      <input type="hidden" name={name} value={value} />
      {preview
        ? <div className="prose-pa min-h-40 bg-white p-4 dark:bg-slate-950" dangerouslySetInnerHTML={{ __html: markdown(value) || '<p class="muted">Nothing to preview yet.</p>' }} />
        : <textarea ref={ta} rows={rows} value={value} onChange={(e) => setValue(e.target.value)} className="block w-full resize-y bg-white p-4 font-mono text-[13px] leading-6 outline-none dark:bg-slate-950" placeholder="Write here. Use the buttons above for headings, bold, lists, tables and pictures." />}
    </div>
  );
}
