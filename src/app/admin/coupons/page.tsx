import { requireFullAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";
import { saveCoupon, toggleCoupon } from "@/app/actions/admin";

export default async function Coupons({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireFullAdmin();
  const { error } = await searchParams;
  const [coupons, courses, bundles, plans] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }), db.course.findMany({ where: { priceInPaise: { gt: 0 } } }), db.bundle.findMany(), db.plan.findMany(),
  ]);
  const names = new Map<string, string>([...courses.map((c) => [c.id, c.title] as const), ...bundles.map((b) => [b.id, b.title] as const), ...plans.map((p) => [p.id, `${p.name} plan`] as const)]);
  return (
    <div>
      <h1 className="h-section">Discount codes</h1>
      <p className="muted mt-1">Create codes to share on WhatsApp, LinkedIn or with partner organisations. Learners enter them at checkout.</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Applies to</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Valid</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>{coupons.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3"><div className="font-mono font-bold">{c.code}</div><div className="muted text-xs">{c.description}</div></td>
              <td className="px-4 py-3">{c.kind === "PERCENT" ? `${c.value}%${c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ""}` : inr(c.value)}</td>
              <td className="px-4 py-3">{c.targetId ? names.get(c.targetId) ?? c.appliesTo : c.appliesTo === "ALL" ? "Everything" : `All ${c.appliesTo.toLowerCase()}s`}</td>
              <td className="px-4 py-3">{c.redeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
              <td className="px-4 py-3 text-xs">{c.validFrom ? fmtDate(c.validFrom) : "Now"} → {c.validTo ? fmtDate(c.validTo) : "No expiry"}</td>
              <td className="px-4 py-3"><form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className={c.active ? "chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "chip"}>{c.active ? "Active" : "Paused"}</button></form></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <h2 className="mt-10 text-xl font-bold">New discount code</h2>
      {error !== undefined && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">A code named {error || "(blank)"} already exists. Choose a different code.</p>}
      <form action={saveCoupon} className="card mt-4 grid gap-4 p-6 sm:grid-cols-3">
        <div><label className="label">Code</label><input name="code" className="input font-mono uppercase" placeholder="DIWALI30" required /></div>
        <div><label className="label">Type</label><select name="kind" className="input"><option value="PERCENT">Percentage off</option><option value="FLAT">Flat ₹ off</option></select></div>
        <div><label className="label">Value (% or ₹)</label><input name="value" type="number" min="1" className="input" required /></div>
        <div className="sm:col-span-3"><label className="label">Description</label><input name="description" className="input" placeholder="Festive offer for all courses" /></div>
        <div><label className="label">Applies to</label><select name="target" className="input">
          <option value="">Everything</option><option value="COURSE">Any course</option><option value="BUNDLE">Any bundle</option><option value="PLAN">Any subscription plan</option>
          <optgroup label="Specific course">{courses.map((c) => <option key={c.id} value={`COURSE:${c.id}`}>{c.title}</option>)}</optgroup>
          <optgroup label="Specific bundle">{bundles.map((b) => <option key={b.id} value={`BUNDLE:${b.id}`}>{b.title}</option>)}</optgroup>
          <optgroup label="Specific plan">{plans.map((p) => <option key={p.id} value={`PLAN:${p.id}`}>{p.name}</option>)}</optgroup>
        </select></div>
        <div><label className="label">Max discount ₹ (for %; 0 = no cap)</label><input name="maxDiscount" type="number" min="0" defaultValue={0} className="input" /></div>
        <div><label className="label">Minimum order ₹</label><input name="minOrder" type="number" min="0" defaultValue={0} className="input" /></div>
        <div><label className="label">Total uses (0 = unlimited)</label><input name="maxRedemptions" type="number" min="0" defaultValue={0} className="input" /></div>
        <div><label className="label">Uses per learner (0 = unlimited)</label><input name="perUserLimit" type="number" min="0" defaultValue={1} className="input" /></div>
        <div />
        <div><label className="label">Valid from</label><input name="validFrom" type="date" className="input" /></div>
        <div><label className="label">Valid until</label><input name="validTo" type="date" className="input" /></div>
        <div className="sm:col-span-3"><button className="btn-primary">Create code</button></div>
      </form>
    </div>
  );
}
