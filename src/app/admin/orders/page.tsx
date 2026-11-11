import { requireFullAdmin } from "@/lib/auth";
import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireFullAdmin();
  const { status } = await searchParams;
  const orders = await db.order.findMany({ where: status ? { status } : {}, include: { user: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-section">Orders</h1>
        <a href="/api/admin/orders.csv" className="btn-ghost"><Download className="h-4 w-4" />Export CSV</a>
      </div>
      <div className="mt-4 flex gap-2 text-sm">{["", "PAID", "PENDING", "FAILED"].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded-lg px-3 py-1.5 ${status === s || (!status && !s) ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900"}`}>{s || "All"}</Link>)}</div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 text-xs">{fmtDate(o.createdAt)}</td><td className="px-4 py-3">{o.user.name}</td><td className="px-4 py-3">{o.itemTitle}</td>
              <td className="px-4 py-3 font-mono text-xs">{o.couponCode ?? "–"}</td><td className="px-4 py-3">{o.discount ? inr(o.discount) : "–"}</td><td className="px-4 py-3 font-semibold">{inr(o.total)}</td>
              <td className="px-4 py-3">{o.status === "PAID" ? <Link href={`/invoice/${o.id}`} className="text-emerald-600 underline">PAID</Link> : o.status}</td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={7} className="muted px-4 py-8 text-center">No orders.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
