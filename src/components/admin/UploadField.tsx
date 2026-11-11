"use client";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

/** A URL text field with an "Upload" button that stores the file and fills in its link. */
export function UploadField({ name, defaultValue, accept, placeholder, onUploaded }: { name: string; defaultValue?: string | null; accept?: string; placeholder?: string; onUploaded?: (fileName: string) => void }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setBusy(true); setMsg("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) setMsg(d.error || "Upload failed");
      else { setValue(d.url); setMsg(`Uploaded ${f.name}`); onUploaded?.(f.name); }
    } catch { setMsg("Upload failed"); }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} className="input" placeholder={placeholder} />
        <button type="button" className="btn-ghost shrink-0" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload
        </button>
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {msg && <p className="muted mt-1 text-xs">{msg}</p>}
    </div>
  );
}
