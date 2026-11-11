import Link from "next/link";
import { Check, Package } from "lucide-react";
import { db } from "@/lib/db";
import { inr, intervalLabel, parseList } from "@/lib/format";

export const metadata = { title: "Plans and bundles" };

export default async function Pricing() {
  const [plans, bundles] = await Promise.all([
    db.plan.findMany({ where: { active: true }, orderBy: { priceInPaise: "asc" } }),
    db.bundle.findMany({ where: { published: true }, include: { courses: { include: { course: true } } } }),
  ]);
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="h-section">Simple pricing for serious learners</h1>
        <p className="muted mt-2">Buy a single course, save with a career bundle, or get everything with a subscription. All prices include GST.</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className={`card relative p-8 ${p.highlight ? "border-2 border-brand-600 shadow-xl" : ""}`}>
            {p.highlight && <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Best value</span>}
            <div className="text-lg font-bold">{p.name}</div>
            <p className="muted text-sm">{p.description}</p>
            <div className="mt-4"><span className="text-4xl font-extrabold">{inr(p.priceInPaise)}</span><span className="muted"> / {intervalLabel(p.interval)}</span></div>
            <ul className="mt-6 space-y-2 text-sm">{parseList(p.features).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />{f}</li>)}</ul>
            <Link href={`/checkout?type=PLAN&id=${p.id}`} className={`${p.highlight ? "btn-primary" : "btn-ghost"} mt-8 w-full py-3`}>Choose {p.name}</Link>
          </div>
        ))}
      </div>

      <h2 className="h-section mt-20 text-center">Career bundles</h2>
      <p className="muted mt-2 text-center">Curated learning paths at a bundled price.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {bundles.map((b) => {
          const sum = b.courses.reduce((a, c) => a + c.course.priceInPaise, 0);
          return (
            <div key={b.id} id={b.slug} className="card scroll-mt-24 p-6">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><Package className="h-5 w-5" /></span>
                <div><div className="text-lg font-bold">{b.title}</div><p className="muted text-sm">{b.description}</p></div></div>
              <ul className="mt-4 space-y-2 text-sm">{b.courses.map(({ course }) => <li key={course.id} className="flex justify-between gap-2"><Link href={`/courses/${course.slug}`} className="hover:text-brand-600">{course.title}</Link><span className="muted">{inr(course.priceInPaise)}</span></li>)}</ul>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div><span className="text-2xl font-extrabold">{inr(b.priceInPaise)}</span> <span className="muted line-through">{inr(sum)}</span> <span className="text-sm font-semibold text-emerald-600">Save {inr(sum - b.priceInPaise)}</span></div>
                <Link href={`/checkout?type=BUNDLE&id=${b.id}`} className="btn-primary">Buy bundle</Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="muted mt-10 text-center text-sm">Have a discount code? You can apply it at checkout.</p>
    </div>
  );
}
