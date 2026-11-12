import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";

export const metadata = { title: "Purchases" };

export default async function Orders() {
  const user = await requireUser();
  const [orders, subs] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.subscription.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="container-x py-8">
      <h1 className="h-section">Purchases and subscriptions</h1>
      {subs.length > 0 && <div className="mt-6 space-y-2">{subs.map((s) => <div key={s.id} className="card flex justify-between p-4 text-sm"><span><b>{s.plan.name} plan</b> · {s.status}</span><span className="muted">Renews/ends {fmtDate(s.currentPeriodEnd)}</span></div>)}</div>}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Coupon</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Invoice</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{fmtDate(o.createdAt)}</td><td className="px-4 py-3">{o.itemTitle}</td><td className="px-4 py-3">{o.couponCode ?? "–"}</td>
                <td className="px-4 py-3">{inr(o.total)}</td><td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3">{o.status === "PAID" && <a className="text-brand-600 underline" href={`/invoice/${o.id}`}>View</a>}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="muted px-4 py-8 text-center">No purchases yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
