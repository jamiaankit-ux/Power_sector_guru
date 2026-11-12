import Link from "next/link";
import { Download, Pencil, Trash2 } from "lucide-react";
import { requireFullAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";
import { deleteCoupon, saveCoupon, toggleCoupon } from "@/app/actions/admin";
import { PageHead, Saved } from "@/components/admin/ui";
import { CodeInput } from "@/components/admin/CodeInput";

export const metadata = { title: "Discount codes" };
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function Coupons({ searchParams }: { searchParams: Promise<{ error?: string; edit?: string; q?: string; saved?: string; made?: string }> }) {
  await requireFullAdmin();
  const { error, edit, q, saved, made } = await searchParams;
  const [coupons, total, courses, bundles, plans, paid] = await Promise.all([
    db.coupon.findMany({ where: q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    db.coupon.count(), db.course.findMany({ where: { priceInPaise: { gt: 0 } } }), db.bundle.findMany(), db.plan.findMany(),
    db.order.groupBy({ by: ["couponCode"], where: { status: "PAID", couponCode: { not: null } }, _sum: { discount: true, total: true } }),
  ]);
  const e = edit ? await db.coupon.findUnique({ where: { id: edit } }) : null;
  const names = new Map<string, string>([...courses.map((c) => [c.id, c.title] as const), ...bundles.map((b) => [b.id, b.title] as const), ...plans.map((p) => [p.id, `${p.name} plan`] as const)]);
  const sales = new Map(paid.map((p) => [p.couponCode, p._sum]));
  return (
    <div className="space-y-5">
      <PageHead title="Discount codes" text="Create a code to share on WhatsApp or LinkedIn, or generate hundreds of single-use codes for a company or a campaign. Learners enter the code at checkout.">
        <a href={`/api/admin/coupons.csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="btn-ghost"><Download className="h-4 w-4" />Download codes</a>
      </PageHead>
      <Saved show={saved} text="Discount code saved." />
      {made && <Saved show={made} text={`${made} single-use codes created. They are listed below; use “Download codes” to get them as a spreadsheet.`} />}
      {error !== undefined && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">A code named {error || "(blank)"} already exists. Choose a different code.</p>}

      <form action={saveCoupon} className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6" id="form">
        <h2 className="text-base font-bold sm:col-span-3">{e ? `Edit ${e.code}` : "New discount code"}</h2>
        {e && <input type="hidden" name="id" value={e.id} />}
        <div className="sm:col-span-2"><label className="label">Code {!e && <span className="muted font-normal">(leave empty to auto-generate; for bulk codes this is the prefix)</span>}</label><CodeInput defaultValue={e?.code} disabled={!!e} /></div>
        {!e && <div><label className="label">How many codes</label><input name="count" type="number" min="1" max="500" defaultValue={1} className="input" /><p className="muted mt-1 text-xs">More than 1 creates unique single-use codes.</p></div>}
        <div><label className="label">Type</label><select name="kind" defaultValue={e?.kind} className="input"><option value="PERCENT">Percentage off</option><option value="FLAT">Flat ₹ off</option></select></div>
        <div><label className="label">Value (% or ₹)</label><input name="value" type="number" min="1" defaultValue={e ? (e.kind === "FLAT" ? e.value / 100 : e.value) : undefined} className="input" required /></div>
        <div><label className="label">Applies to</label><select name="target" defaultValue={e ? (e.targetId ? `${e.appliesTo}:${e.targetId}` : e.appliesTo === "ALL" ? "" : e.appliesTo) : ""} className="input">
          <option value="">Everything</option><option value="COURSE">Any course</option><option value="BUNDLE">Any bundle</option><option value="PLAN">Any subscription plan</option>
          <optgroup label="Specific course">{courses.map((c) => <option key={c.id} value={`COURSE:${c.id}`}>{c.title}</option>)}</optgroup>
          <optgroup label="Specific bundle">{bundles.map((b) => <option key={b.id} value={`BUNDLE:${b.id}`}>{b.title}</option>)}</optgroup>
          <optgroup label="Specific plan">{plans.map((p) => <option key={p.id} value={`PLAN:${p.id}`}>{p.name}</option>)}</optgroup>
        </select></div>
        <div className="sm:col-span-3"><label className="label">Note for yourself</label><input name="description" defaultValue={e?.description} className="input" placeholder="Festive offer, NTPC batch, LinkedIn campaign…" /></div>
        <div><label className="label">Max discount ₹ (for %; 0 = no cap)</label><input name="maxDiscount" type="number" min="0" defaultValue={e ? e.maxDiscount / 100 : 0} className="input" /></div>
        <div><label className="label">Minimum order ₹</label><input name="minOrder" type="number" min="0" defaultValue={e ? e.minOrder / 100 : 0} className="input" /></div>
        <div><label className="label">Total uses (0 = unlimited)</label><input name="maxRedemptions" type="number" min="0" defaultValue={e?.maxRedemptions ?? 0} className="input" /></div>
        <div><label className="label">Uses per learner (0 = unlimited)</label><input name="perUserLimit" type="number" min="0" defaultValue={e?.perUserLimit ?? 1} className="input" /></div>
        <div><label className="label">Valid from</label><input name="validFrom" type="date" defaultValue={day(e?.validFrom ?? null)} className="input" /></div>
        <div><label className="label">Valid until</label><input name="validTo" type="date" defaultValue={day(e?.validTo ?? null)} className="input" /></div>
        <div className="flex gap-2 sm:col-span-3"><button className="btn-primary">{e ? "Save changes" : "Create"}</button>{e && <Link href="/admin/coupons" className="btn-ghost">Cancel</Link>}</div>
      </form>

      <form className="flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="Search code or note" /><button className="btn-ghost">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Applies to</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Valid</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
          <tbody>{coupons.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3"><div className="font-mono font-bold">{c.code}</div><div className="muted text-xs">{c.description}</div></td>
              <td className="px-4 py-3">{c.kind === "PERCENT" ? `${c.value}%${c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ""}` : inr(c.value)}</td>
              <td className="px-4 py-3">{c.targetId ? names.get(c.targetId) ?? c.appliesTo : c.appliesTo === "ALL" ? "Everything" : `All ${c.appliesTo.toLowerCase()}s`}</td>
              <td className="px-4 py-3">{c.redeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
              <td className="px-4 py-3 text-xs">{sales.get(c.code)?.total ? <>{inr(sales.get(c.code)!.total!)}<div className="muted">{inr(sales.get(c.code)!.discount ?? 0)} given</div></> : "–"}</td>
              <td className="px-4 py-3 text-xs">{c.validFrom ? fmtDate(c.validFrom) : "Now"} → {c.validTo ? fmtDate(c.validTo) : "No expiry"}</td>
              <td className="px-4 py-3"><form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button title="Click to pause or resume" className={c.active ? "chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "chip"}>{c.active ? "Active" : "Paused"}</button></form></td>
              <td className="px-4 py-3"><div className="flex items-center gap-1">
                <Link href={`/admin/coupons?edit=${c.id}#form`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit"><Pencil className="h-4 w-4" /></Link>
                <form action={deleteCoupon}><input type="hidden" name="id" value={c.id} /><button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800" title={c.redeemed ? "Switch off (already used, so kept on record)" : "Delete"}><Trash2 className="h-4 w-4" /></button></form>
              </div></td>
            </tr>
          ))}
          {coupons.length === 0 && <tr><td colSpan={8} className="muted px-4 py-8 text-center">No codes{q ? " match your search" : " yet"}.</td></tr>}</tbody>
        </table>
      </div>
      <p className="muted text-xs">Showing {coupons.length} of {total} codes.</p>
    </div>
  );
}
