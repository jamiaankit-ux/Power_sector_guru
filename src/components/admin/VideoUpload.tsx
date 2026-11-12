"use client";
import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

/** Video link field with direct upload (resumable to Bunny Stream, or straight to your storage bucket) and a progress bar. */
export function VideoUpload({ name, defaultValue, onDone }: { name?: string; defaultValue?: string | null; onDone?: () => void }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setMsg(""); setPct(0);
    try {
      const r = await fetch("/api/admin/video-upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.name, type: f.type || "video/mp4", size: f.size }) });
      const u = await r.json();
      if (!r.ok) throw new Error(u.error || "Could not start the upload");
      if (u.kind === "bunny") {
        const tus = await import("tus-js-client");
        await new Promise<void>((resolve, reject) => {
          new tus.Upload(f, {
            endpoint: u.endpoint, retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
            headers: { AuthorizationSignature: u.signature, AuthorizationExpire: String(u.expire), VideoId: u.videoId, LibraryId: String(u.libraryId) },
            metadata: { filetype: f.type, title: f.name },
            onError: reject, onProgress: (sent, total) => setPct(Math.round((sent / total) * 100)), onSuccess: () => resolve(),
          }).start();
        });
        setMsg("Uploaded. Bunny is now preparing the different qualities; the video plays in a few minutes.");
      } else {
        await new Promise<void>((resolve, reject) => {
          const x = new XMLHttpRequest();
          x.open("PUT", u.putUrl); x.setRequestHeader("Content-Type", f.type || "video/mp4");
          x.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
          x.onload = () => (x.status < 300 ? resolve() : reject(new Error("Storage rejected the upload (check the bucket's CORS settings).")));
          x.onerror = () => reject(new Error("Upload failed. Check your connection and the bucket's CORS settings."));
          x.send(f);
        });
        setMsg("Uploaded.");
      }
      setValue(u.url); onDone?.();
    } catch (e) { setMsg((e as Error).message || "Upload failed"); }
    setPct(null);
  }

  return (
    <div>
      <div className="flex gap-2">
        {name && <input name={name} value={value} onChange={(e) => setValue(e.target.value)} className="input" placeholder="Upload a video, or paste a link (HLS .m3u8, MP4, or unlisted YouTube)" />}
        <button type="button" className={name ? "btn-ghost shrink-0" : "btn-primary"} disabled={pct !== null} onClick={() => input.current?.click()}>
          {pct !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{pct !== null ? `${pct}%` : "Upload video"}
        </button>
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {pct !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} /></div>}
      {msg && <p className="muted mt-1 text-xs">{msg}</p>}
      {pct !== null && <p className="muted mt-1 text-xs">Keep this page open until the upload finishes. Large videos resume automatically if the connection drops.</p>}
    </div>
  );
}
