import Link from "next/link";
import { FileText, Film, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { bunnyConfigured } from "@/lib/video";
import { s3Configured } from "@/lib/storage";
import { deleteMedia } from "@/app/actions/admin";
import { PageHead } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const metadata = { title: "Media and videos" };
const size = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const stores: Record<string, string> = { database: "Database", bucket: "Storage bucket", bunny: "Bunny Stream" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const me = await requireAdmin();
  const { kind } = await searchParams;
  const [items, bunny, bucket] = await Promise.all([
    db.media.findMany({ where: kind ? { kind } : {}, orderBy: { createdAt: "desc" }, take: 300 }), bunnyConfigured(), s3Configured(),
  ]);
  return (
    <div className="space-y-5">
      <PageHead title="Media and videos" text="Everything you have uploaded. Upload here, then copy the link into a lesson or page; or upload directly from the lesson editor." />
      {!bunny && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          Video hosting is not connected yet{bucket ? ", so videos go to your storage bucket as plain MP4 files (no automatic quality switching)" : ", so video upload is off"}.
          {me.role === "ADMIN" ? <> Connect Bunny Stream in <Link className="font-semibold underline" href="/admin/integrations">Payments and integrations</Link>.</> : " Ask the admin to connect Bunny Stream."}
        </p>
      )}
      <MediaUploader />
      <div className="flex gap-2 text-sm">{[["", "All"], ["VIDEO", "Videos"], ["IMAGE", "Pictures"], ["FILE", "Files"]].map(([k, l]) => <Link key={k} href={k ? `?kind=${k}` : "?"} className={`rounded-lg px-3 py-1.5 font-medium ${(kind ?? "") === k ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900"}`}>{l}</Link>)}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="grid h-32 place-items-center bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.kind === "IMAGE" ? <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : m.kind === "VIDEO" ? <Film className="h-10 w-10 text-slate-400" /> : <FileText className="h-10 w-10 text-slate-400" />}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium" title={m.name}>{m.name}</div>
              <div className="muted text-xs">{size(m.size)} · {stores[m.store] ?? m.store} · {fmtDate(m.createdAt)}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex gap-3"><CopyButton text={m.url} /><a href={m.url} target="_blank" className="text-xs font-medium text-brand-600">Open</a></span>
                <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><button className="rounded-lg p-1 text-slate-400 hover:text-rose-600" title="Delete (lessons using this link will stop working)"><Trash2 className="h-4 w-4" /></button></form>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="muted py-8 text-center text-sm">Nothing uploaded yet.</p>}
    </div>
  );
}
