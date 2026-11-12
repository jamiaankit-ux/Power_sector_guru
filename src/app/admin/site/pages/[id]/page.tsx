import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { deletePage, savePage } from "@/app/actions/admin";
import { Saved } from "@/components/admin/ui";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const p = id === "new" ? null : await db.page.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <div className="space-y-5">
      <Link href="/admin/site/pages" className="muted text-sm">← Pages</Link>
      <Saved show={saved} text="Page saved." />
      <form action={savePage} className="space-y-5">
        {p && <input type="hidden" name="id" value={p.id} />}
        <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2"><label className="label" htmlFor="title">Page title</label><input id="title" name="title" defaultValue={p?.title} className="input text-lg font-semibold" placeholder="About us" required /></div>
          <div><label className="label" htmlFor="slug">Address</label><div className="flex"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">/</span><input id="slug" name="slug" defaultValue={p?.slug} className="input rounded-l-none font-mono" placeholder="about-us (made from the title if empty)" /></div></div>
          <div><label className="label" htmlFor="order">Menu position (smaller first)</label><input id="order" name="order" type="number" defaultValue={p?.order ?? 0} className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="summary">Short introduction (optional)</label><input id="summary" name="summary" defaultValue={p?.summary} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Content</label><MarkdownEditor name="body" defaultValue={p?.body ?? ""} rows={18} /></div>
          <div className="flex flex-wrap gap-6 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={p?.published} />Live on the website</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="showInNav" defaultChecked={p?.showInNav} />Show in top menu</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="showInFooter" defaultChecked={p?.showInFooter ?? true} />Show in footer</label>
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary">{p ? "Save page" : "Create page"}</button>
          {p && <a href={`/${p.slug}`} target="_blank" className="btn-ghost">{p.published ? "View page" : "Preview draft"}</a>}
        </div>
      </form>
      {p && <form action={deletePage}><input type="hidden" name="id" value={p.id} /><button className="flex items-center gap-1.5 text-sm text-rose-600 hover:underline"><Trash2 className="h-4 w-4" />Delete this page</button></form>}
    </div>
  );
}
