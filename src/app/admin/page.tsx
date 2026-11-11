import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { dayKey, fmtDate, hours, inr } from "@/lib/format";

export const metadata = { title: "Admin" };

const money = (p: number) => (p === 0 ? "₹0" : inr(p));

function Bars({ days, values, color, fmt }: { days: string[]; values: Map<string, number>; color: string; fmt: (v: number) => string }) {
  const max = Math.max(1, ...days.map((d) => values.get(d) ?? 0));
  return (
    <div className="mt-4 flex h-36 items-end gap-[2px]">
      {days.map((d) => { const v = values.get(d) ?? 0; return <div key={d} title={`${d}: ${fmt(v)}`} className={`flex-1 rounded-t ${v ? color : "bg-slate-100 dark:bg-slate-800"}`} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />; })}
    </div>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireFullAdmin();
  const range = [7, 30, 90].includes(Number((await searchParams).range)) ? Number((await searchParams).range) : 30;
  const since = new Date(Date.now() - range * 86400_000);
  const sinceKey = dayKey(since);
  const [users, newUsers, enrollments, newEnrollments, certs, paid, active, recent, courses, watch, attempts, signups] = await Promise.all([
    db.user.count(), db.user.count({ where: { createdAt: { gte: since } } }),
    db.enrollment.count(), db.enrollment.count({ where: { createdAt: { gte: since } } }),
    db.certificate.count({ where: { issuedAt: { gte: since } } }),
    db.order.findMany({ where: { status: "PAID", paidAt: { gte: since } }, select: { total: true, paidAt: true, discount: true } }),
    db.dailyActivity.groupBy({ by: ["userId"], where: { day: { gte: sinceKey } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.course.findMany({ include: { _count: { select: { enrollments: true, certificates: true } } } }),
    db.dailyActivity.groupBy({ by: ["day"], where: { day: { gte: sinceKey } }, _sum: { seconds: true } }),
    db.quizAttempt.findMany({ where: { createdAt: { gte: since } }, select: { passed: true, percent: true } }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const discounts = paid.reduce((a, o) => a + o.discount, 0);
  const watchSec = watch.reduce((a, w) => a + (w._sum.seconds ?? 0), 0);
  const passRate = attempts.length ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100) : 0;
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, x) => a + x.percent, 0) / attempts.length) : 0;
  const days = Array.from({ length: range }, (_, i) => dayKey(new Date(Date.now() - (range - 1 - i) * 86400_000)));
  const revByDay = new Map<string, number>();
  for (const o of paid) if (o.paidAt) revByDay.set(dayKey(o.paidAt), (revByDay.get(dayKey(o.paidAt)) ?? 0) + o.total);
  const watchByDay = new Map(watch.map((w) => [w.day, w._sum.seconds ?? 0]));
  const signByDay = new Map<string, number>();
  for (const u of signups) signByDay.set(dayKey(u.createdAt), (signByDay.get(dayKey(u.createdAt)) ?? 0) + 1);
  const tiles = [
    ["Revenue", money(revenue), `${paid.length} paid orders`],
    ["New learners", newUsers.toLocaleString("en-IN"), `${users.toLocaleString("en-IN")} in total`],
    ["Active learners", String(active.length), `${users ? Math.round((active.length / users) * 100) : 0}% of all learners`],
    ["New enrollments", String(newEnrollments), `${enrollments} in total`],
    ["Watch hours", hours(watchSec), `${active.length ? hours(watchSec / active.length) : "0"} h per active learner`],
    ["Quiz pass rate", `${passRate}%`, `${attempts.length} attempts · avg score ${avgScore}%`],
    ["Certificates issued", String(certs), "in this period"],
    ["Discounts given", money(discounts), "via codes"],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-section">Overview</h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
          {[7, 30, 90].map((r) => <Link key={r} href={`/admin?range=${r}`} className={`rounded-lg px-3 py-1.5 ${r === range ? "bg-white shadow dark:bg-slate-950" : "text-slate-500"}`}>{r} days</Link>)}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tiles.map(([k, v, h]) => <div key={k} className="card p-5"><div className="muted text-sm">{k}</div><div className="mt-1 text-2xl font-extrabold">{v}</div><div className="muted text-xs">{h}</div></div>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-6"><div className="font-semibold">Revenue</div><Bars days={days} values={revByDay} color="bg-emerald-500" fmt={money} /></div>
        <div className="card p-6"><div className="font-semibold">Watch hours</div><Bars days={days} values={watchByDay} color="bg-brand-600" fmt={(v) => `${hours(v)} h`} /></div>
        <div className="card p-6"><div className="font-semibold">New sign-ups</div><Bars days={days} values={signByDay} color="bg-amber-500" fmt={String} /></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <a href="/api/admin/learners.csv" className="btn-ghost"><Download className="h-4 w-4" />Learners CSV</a>
        <a href="/api/admin/progress.csv" className="btn-ghost"><Download className="h-4 w-4" />Course progress CSV</a>
        <a href="/api/admin/orders.csv" className="btn-ghost"><Download className="h-4 w-4" />Orders CSV</a>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="p-5 font-semibold">Courses (all time)</div>
          <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-5 py-2">Course</th><th className="px-3 py-2">Enrolled</th><th className="px-3 py-2">Completed</th><th className="px-3 py-2">Rate</th></tr></thead>
            <tbody>{courses.sort((a, b) => b._count.enrollments - a._count.enrollments).map((c) => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-5 py-2"><Link href={`/admin/courses/${c.id}`} className="hover:text-brand-600">{c.title}</Link></td><td className="px-3 py-2">{c._count.enrollments}</td><td className="px-3 py-2">{c._count.certificates}</td><td className="px-3 py-2">{c._count.enrollments ? Math.round((c._count.certificates / c._count.enrollments) * 100) : 0}%</td></tr>
            ))}</tbody></table>
        </div>
        <div className="card overflow-hidden">
          <div className="flex justify-between p-5 font-semibold">Recent orders<Link href="/admin/orders" className="text-sm text-brand-600">All</Link></div>
          <ul>{recent.map((o) => <li key={o.id} className="flex justify-between gap-2 border-t border-slate-100 px-5 py-2 text-sm dark:border-slate-800"><span><b>{o.user.name}</b> · {o.itemTitle}</span><span className="shrink-0">{inr(o.total)} · <span className={o.status === "PAID" ? "text-emerald-600" : "muted"}>{o.status}</span> · <span className="muted">{fmtDate(o.createdAt)}</span></span></li>)}
            {recent.length === 0 && <li className="muted px-5 pb-5 text-sm">No orders yet.</li>}</ul>
        </div>
      </div>
    </div>
  );
}
