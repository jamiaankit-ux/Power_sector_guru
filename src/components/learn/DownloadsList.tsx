"use client";
import { useEffect, useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { native, playableUrl, readIndex, removeOffline, type OfflineItem } from "@/lib/offline";

export function DownloadsList() {
  const [items, setItems] = useState<OfflineItem[] | null>(null);
  const [isApp, setIsApp] = useState(true);
  const [now, setNow] = useState<{ item: OfflineItem; src: string } | null>(null);
  useEffect(() => { (async () => { if (!(await native())) { setIsApp(false); setItems([]); return; } setItems(await readIndex()); })().catch(() => setItems([])); }, []);
  if (!isApp) return <p className="card mt-6 p-6 text-sm">Offline videos are available in the Power Sector Academy app for Android and iPhone. Open a lesson in the app and tap “Download for offline”.</p>;
  if (!items) return <p className="muted mt-6 text-sm">Loading…</p>;
  return (
    <div className="mt-6 space-y-3">
      {now && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video src={now.src} controls autoPlay playsInline controlsList="nodownload" className="aspect-video w-full" onContextMenu={(e) => e.preventDefault()} />
          {now.item.owner && <div className="pointer-events-none absolute left-4 top-4 text-xs text-white/30">{now.item.owner}</div>}
        </div>
      )}
      {items.map((i) => (
        <div key={i.lessonId} className="card flex items-center gap-3 p-4">
          <button onClick={async () => setNow({ item: i, src: await playableUrl(i) })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white" aria-label="Play"><Play className="h-5 w-5 translate-x-0.5 fill-current" /></button>
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{i.title}</div><div className="muted text-xs">{(i.size / 1e6).toFixed(0)} MB · available until {new Date(i.expires).toLocaleDateString("en-IN")}</div></div>
          <button onClick={async () => { await removeOffline(i.lessonId); setItems(await readIndex()); if (now?.item.lessonId === i.lessonId) setNow(null); }} className="rounded-lg p-2 text-slate-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      {items.length === 0 && <p className="card p-6 text-sm">No offline videos yet. Open a video lesson and tap “Download for offline”.</p>}
    </div>
  );
}
