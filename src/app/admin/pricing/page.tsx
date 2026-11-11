import { db } from "@/lib/db";
import { parseList } from "@/lib/format";
import { saveBundle, savePlan } from "@/app/actions/admin";
import type { Plan } from "@prisma/client";

function PlanForm({ p }: { p?: Plan }) {
  return (
    <form action={savePlan} className="card grid gap-3 p-5 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div><label className="label">Plan name</label><input name="name" defaultValue={p?.name} className="input" required /></div>
      <div><label className="label">Billing period</label><select name="interval" defaultValue={p?.interval ?? "YEAR"} className="input"><option value="MONTH">Monthly</option><option value="QUARTER">Quarterly</option><option value="YEAR">Yearly</option></select></div>
      <div><label className="label">Price (₹)</label><input name="price" type="number" min="0" defaultValue={p ? p.priceInPaise / 100 : ""} className="input" required /></div>
      <div><label className="label">Short description</label><input name="description" defaultValue={p?.description} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Features (one per line)</label><textarea name="features" rows={3} defaultValue={p ? parseList(p.features).join("\n") : ""} className="input" /></div>
      <div className="flex gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} />Active</label><label className="flex items-center gap-2"><input type="checkbox" name="highlight" defaultChecked={p?.highlight} />Highlight</label></div>
      <div className="text-right"><button className="btn-primary">{p ? "Save" : "Add plan"}</button></div>
    </form>
  );
}

export default async function AdminPricing() {
  const [plans, bundles, courses] = await Promise.all([
    db.plan.findMany({ orderBy: { priceInPaise: "asc" } }),
    db.bundle.findMany({ include: { courses: true } }),
    db.course.findMany({ orderBy: { title: "asc" } }),
  ]);
  const bundleForm = (b?: (typeof bundles)[number]) => (
    <form action={saveBundle} className="card grid gap-3 p-5 sm:grid-cols-2" key={b?.id ?? "new"}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="sm:col-span-2"><label className="label">Bundle title</label><input name="title" defaultValue={b?.title} className="input" required /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><input name="description" defaultValue={b?.description} className="input" /></div>
      <div><label className="label">Bundle price (₹)</label><input name="price" type="number" defaultValue={b ? b.priceInPaise / 100 : ""} className="input" required /></div>
      <div><label className="label">List price (₹)</label><input name="mrp" type="number" defaultValue={b ? b.mrpInPaise / 100 : 0} className="input" /></div>
      <div><label className="label">Access days (0 = lifetime)</label><input name="accessDays" type="number" defaultValue={b?.accessDays ?? 365} className="input" /></div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="published" defaultChecked={b?.published ?? true} />Published</label>
      <fieldset className="sm:col-span-2"><legend className="label">Courses in this bundle</legend>
        <div className="grid gap-1 sm:grid-cols-2">{courses.map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="courseIds" value={c.id} defaultChecked={b?.courses.some((x) => x.courseId === c.id)} />{c.title}</label>)}</div>
      </fieldset>
      <div className="sm:col-span-2"><button className="btn-primary">{b ? "Save bundle" : "Create bundle"}</button></div>
    </form>
  );
  return (
    <div>
      <h1 className="h-section">Plans and bundles</h1>
      <p className="muted mt-1">Subscription plans unlock every course while active. Bundles sell a set of courses at one price. All prices are GST-inclusive.</p>
      <h2 className="mt-8 text-xl font-bold">Subscription plans</h2>
      <div className="mt-4 space-y-4">{plans.map((p) => <PlanForm key={p.id} p={p} />)}<details><summary className="btn-ghost cursor-pointer">+ New plan</summary><div className="mt-3"><PlanForm /></div></details></div>
      <h2 className="mt-10 text-xl font-bold">Bundles</h2>
      <div className="mt-4 space-y-4">{bundles.map((b) => bundleForm(b))}<details><summary className="btn-ghost cursor-pointer">+ New bundle</summary><div className="mt-3">{bundleForm()}</div></details></div>
    </div>
  );
}
