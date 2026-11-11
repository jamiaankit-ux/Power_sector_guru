import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { getSettings } from "@/lib/settings";

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const o = await db.order.findFirst({ where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }), status: "PAID" }, include: { user: true } });
  if (!o) notFound();
  const st = await getSettings();
  return (
    <div className="container-x max-w-2xl py-10">
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <div className="card p-8">
        <div className="flex items-start justify-between"><div><Logo /><div className="muted mt-2 text-xs">{st.companyName}{st.address && <><br />{st.address}</>}{st.gstin && <><br />GSTIN {st.gstin}</>}</div></div><div className="text-right text-sm"><div className="text-xl font-bold">Tax invoice</div><div className="muted">#{o.id.slice(-10).toUpperCase()}</div><div className="muted">{fmtDate(o.paidAt ?? o.createdAt)}</div></div></div>
        <div className="mt-8 text-sm"><div className="muted">Billed to</div><div className="font-semibold">{o.user.name}</div><div>{o.user.email ?? o.user.phone}</div>{o.user.organization && <div>{o.user.organization}</div>}</div>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left dark:border-slate-700"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr><td className="py-2">{o.itemTitle}</td><td className="py-2 text-right">{inr(o.amount)}</td></tr>
            {o.discount > 0 && <tr><td className="py-2">Discount ({o.couponCode})</td><td className="py-2 text-right">−{inr(o.discount)}</td></tr>}
            <tr className="border-t border-slate-200 dark:border-slate-700"><td className="py-2 muted">Taxable value</td><td className="py-2 text-right muted">{inr(o.total - o.tax)}</td></tr>
            <tr><td className="py-2 muted">GST</td><td className="py-2 text-right muted">{inr(o.tax)}</td></tr>
            <tr className="border-t border-slate-200 font-bold dark:border-slate-700"><td className="py-2">Total paid</td><td className="py-2 text-right">{inr(o.total)}</td></tr>
          </tbody>
        </table>
        <p className="muted mt-8 text-xs">Payment reference: {o.providerRef ?? "–"} · via {o.provider}.{!st.gstin && " Add your GSTIN and address in Admin > Settings."}</p>
      </div>
    </div>
  );
}
