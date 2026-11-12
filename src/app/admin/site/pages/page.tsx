import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "Pages" };

export default async function Pages() {
  await requireFullAdmin();
  const pages = await db.page.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="space-y-5">
      <PageHead title="Pages" text="Write your own pages: About us, Contact, Faculty, Corporate training, FAQs. Each gets its own address and can appear in the menu or footer.">
        <Link href="/admin/site/pages/new" className="btn-primary"><Plus className="h-4 w-4" />New page</Link>
      </PageHead>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Page</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Shown in</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3"><Link href={`/admin/site/pages/${p.id}`} className="font-medium hover:text-brand-600">{p.title}</Link></td>
                <td className="px-4 py-3 font-mono text-xs">/{p.slug}</td>
                <td className="px-4 py-3 text-xs">{[p.showInNav && "Top menu", p.showInFooter && "Footer"].filter(Boolean).join(", ") || "Link only"}</td>
                <td className="px-4 py-3">{p.published ? <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Live</span> : <span className="chip">Draft</span>}</td>
                <td className="px-4 py-3 text-xs">{fmtDate(p.updatedAt)}</td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={5} className="muted px-4 py-8 text-center">No pages yet. Create your first one, for example “About us”.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted text-sm">Terms, Privacy and Refund policy pages are edited in Business and policies.</p>
    </div>
  );
}
