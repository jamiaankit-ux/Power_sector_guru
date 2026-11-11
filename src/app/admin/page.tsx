import Link from "next/link";
import { db } from "@/lib/db";
import { dayKey, fmtDate, hours, inr } from "@/lib/format";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [users, newUsers, enrollments, certs, paid, activeDays, recent, courses, watch] = await Promise.all([
    db.user.count(), db.user.count({ where: { createdAt: { gte: weekAgo } } }), db.enrollment.count(), db.certificate.count(),
    db.order.findMany({ where: { status: "PAID" }, select: { total: true, paidAt: true, discount: true } }),
    db.dailyActivity.groupBy({ by: ["userId"], where: { day: { gte: dayKey(weekAgo) } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.course.findMany({ include: { _count: { select: { enrollments: true, certificates: true } } } }),
    db.dailyActivity.aggregate({ _sum: { seconds: true } }),
  ]);
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const discounts = paid.reduce((a, o) => a + o.discount, 0);
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(Date.now() - (29 - i) * 86400_000)));
  const revByDay = new Map<string, number>();
  for (const o of paid) if (o.paidAt) revByDay.set(dayKey(o.paidAt), (revByDay.get(dayKey(o.paidAt)) ?? 0) + o.total);
  const maxRev = Math.max(1, ...days.map((d) => revByDay.get(d) ?? 0));
  const tiles = [
    ["Revenue", inr(revenue) === "Free" ? "₹0" : inr(revenue), `${paid.length} paid orders`],
    ["Learners", users.toLocaleString("en-IN"), `+${newUsers} this week`],
    ["Active this week", String(activeDays.length), `${users ? Math.round((activeDays.length / users) * 100) : 0}% of learners`],
    ["Enrollments", String(enrollments), `${certs} certificates issued`],
    ["Watch hours", hours(watch._sum.seconds ?? 0), "all learners"],
    ["Discounts given", inr(discounts) === "Free" ? "₹0" : inr(discounts), "via codes"],
  ];
  return (
    <div>
      <h1 className="h-section">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {tiles.map(([k, v, h]) => <div key={k} className="card p-5"><div className="muted text-sm">{k}</div><div className="mt-1 text-2xl font-extrabold">{v}</div><div className="muted text-xs">{h}</div></div>)}
      </div>
      <div className="card mt-6 p-6">
        <div className="font-semibold">Revenue, last 30 days</div>
        <div className="mt-4 flex h-40 items-end gap-1">
          {days.map((d) => { const v = revByDay.get(d) ?? 0; return <div key={d} title={`${d}: ${inr(v)}`} className={`flex-1 rounded-t ${v ? "bg-emerald-500" : "bg-slate-100 dark:bg-slate-800"}`} style={{ height: `${Math.max(2, (v / maxRev) * 100)}%` }} />; })}
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="p-5 font-semibold">Courses</div>
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
