import Link from "next/link";
import { Download } from "lucide-react";
import { requireFullAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";
import { createManualOrder, markOrderPaid, refundOrder } from "@/app/actions/admin";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const tone: Record<string, string> = { PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", REFUNDED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", FAILED: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; ok?: string; error?: string }> }) {
  await requireFullAdmin();
  const { status, q, ok, error } = await searchParams;
  const [orders, courses, bundles, plans] = await Promise.all([
    db.order.findMany({
      where: { ...(status ? { status } : {}), ...(q ? { OR: [{ user: { name: { contains: q, mode: "insensitive" } } }, { user: { email: { contains: q, mode: "insensitive" } } }, { user: { phone: { contains: q } } }, { couponCode: { contains: q, mode: "insensitive" } }, { providerRef: { contains: q } }] } : {}) },
      include: { user: true }, orderBy: { createdAt: "desc" }, take: 200,
    }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, priceInPaise: true } }),
    db.bundle.findMany({ select: { id: true, title: true } }), db.plan.findMany({ select: { id: true, name: true } }),
  ]);
  return (
    <div className="space-y-5">
      <PageHead title="Orders" text="Every purchase. Refund an order, confirm a stuck payment, or record a sale you collected yourself by bank transfer, UPI or invoice.">
        <a href="/api/admin/orders.csv" className="btn-ghost"><Download className="h-4 w-4" />Export CSV</a>
      </PageHead>
      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Record an offline sale</summary>
        <form action={createManualOrder} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Learner's email or mobile</label><input name="learner" className="input" required placeholder="They must already have an account" /></div>
          <div><label className="label">What they bought</label><select name="item" className="input" required>
            <option value="">Choose…</option>
            <optgroup label="Courses">{courses.map((c) => <option key={c.id} value={`COURSE:${c.id}`}>{c.title}</option>)}</optgroup>
            <optgroup label="Bundles">{bundles.map((b) => <option key={b.id} value={`BUNDLE:${b.id}`}>{b.title}</option>)}</optgroup>
            <optgroup label="Plans">{plans.map((p) => <option key={p.id} value={`PLAN:${p.id}`}>{p.name} plan</option>)}</optgroup>
          </select></div>
          <div><label className="label">Amount received ₹ (empty = list price)</label><input name="amount" type="number" min="0" className="input" /></div>
          <div><label className="label">Payment reference</label><input name="reference" className="input" placeholder="UTR / cheque / invoice number" /></div>
          <div className="sm:col-span-2"><label className="label">Note</label><input name="note" className="input" placeholder="Corporate batch, paid by NEFT…" /></div>
          <div className="sm:col-span-2"><button className="btn-primary">Record sale and give access</button></div>
        </form>
      </details>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["", "PAID", "PENDING", "FAILED", "REFUNDED"].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded-lg px-3 py-1.5 font-medium ${status === s || (!status && !s) ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900"}`}>{s ? s[0] + s.slice(1).toLowerCase() : "All"}</Link>)}
        <form className="ml-auto flex gap-2">{status && <input type="hidden" name="status" value={status} />}<input name="q" defaultValue={q} className="input w-56 py-1.5" placeholder="Learner, code or reference" /><button className="btn-ghost py-1.5">Search</button></form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Paid by</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id} className="border-t border-slate-100 align-top dark:border-slate-800">
              <td className="px-4 py-3 text-xs">{fmtDate(o.createdAt)}</td>
              <td className="px-4 py-3"><Link href={`/admin/users/${o.userId}`} className="hover:text-brand-600">{o.user.name}</Link><div className="muted text-xs">{o.user.email ?? o.user.phone}</div></td>
              <td className="px-4 py-3">{o.itemTitle}{o.note && <div className="muted text-xs">{o.note}</div>}</td>
              <td className="px-4 py-3 font-mono text-xs">{o.couponCode ?? "–"}{o.discount > 0 && <div className="muted font-sans">−{inr(o.discount)}</div>}</td>
              <td className="px-4 py-3 font-semibold">{o.total === 0 ? "₹0" : inr(o.total)}</td>
              <td className="px-4 py-3 text-xs">{o.provider}<div className="muted max-w-28 truncate" title={o.providerRef ?? ""}>{o.providerRef}</div></td>
              <td className="px-4 py-3"><span className={`chip ${tone[o.status] ?? ""}`}>{o.status[0] + o.status.slice(1).toLowerCase()}</span></td>
              <td className="px-4 py-3 text-xs">
                {o.status === "PAID" && <div className="flex flex-col items-start gap-1"><Link href={`/invoice/${o.id}`} target="_blank" className="text-brand-600 underline">Invoice</Link>
                  <details><summary className="cursor-pointer text-rose-600">Refund</summary><form action={refundOrder} className="mt-2 w-48 space-y-2"><input type="hidden" name="id" value={o.id} /><input name="reason" className="input py-1.5 text-xs" placeholder="Reason" /><button className="btn-danger w-full py-1.5 text-xs">Refund {inr(o.total)} and remove access</button></form></details></div>}
                {(o.status === "PENDING" || o.status === "FAILED") && <form action={markOrderPaid}><input type="hidden" name="id" value={o.id} /><button className="text-brand-600 underline" title="Use when the money reached you but the order did not complete">Mark as paid</button></form>}
              </td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={8} className="muted px-4 py-8 text-center">No orders.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
