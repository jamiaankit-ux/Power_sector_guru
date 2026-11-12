"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import { downloadSource, native, readIndex, removeOffline, saveOffline } from "@/lib/offline";

/** "Download for offline" under the video. Only appears inside the Android / iPhone apps. */
export function OfflineButton({ lessonId, url, title, owner = "" }: { lessonId: string; url: string; title: string; owner?: string }) {
  const [state, setState] = useState<"hidden" | "idle" | "saved" | number>("hidden");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      if (!(await native()) || downloadSource(url).length === 0) return;
      setState((await readIndex()).some((i) => i.lessonId === lessonId) ? "saved" : "idle");
    })().catch(() => {});
  }, [lessonId, url]);
  if (state === "hidden") return null;
  const save = async () => {
    setMsg(""); setState(0);
    try { await saveOffline(lessonId, title, url, owner, (p) => setState(p)); setState("saved"); }
    catch (e) { setMsg((e as Error).message); setState("idle"); }
  };
  return (
    <span className="ml-auto flex items-center gap-2">
      {msg && <span className="text-rose-600">{msg}</span>}
      {state === "idle" && <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold dark:bg-slate-800"><Download className="h-4 w-4" />Download for offline</button>}
      {typeof state === "number" && <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold dark:bg-slate-800"><Loader2 className="h-4 w-4 animate-spin" />Saving {state}%</span>}
      {state === "saved" && <>
        <a href="/downloads" className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Saved offline</a>
        <button onClick={async () => { await removeOffline(lessonId); setState("idle"); }} aria-label="Remove download" className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </>}
    </span>
  );
}
