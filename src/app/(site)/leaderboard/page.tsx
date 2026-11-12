import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { dayKey, hours } from "@/lib/format";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range = "30" } = await searchParams;
  const since = dayKey(new Date(Date.now() - Number(range === "all" ? 3650 : range) * 86400_000));
  const me = await currentUser();
  const rows = await db.dailyActivity.groupBy({ by: ["userId"], where: { day: { gte: since } }, _sum: { seconds: true }, orderBy: { _sum: { seconds: "desc" } }, take: 50 });
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true, organization: true, _count: { select: { certificates: true } } } });
  const byId = new Map(users.map((u) => [u.id, u]));
  return (
    <div className="container-x max-w-3xl py-10">
      <div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-volt-500" /><h1 className="h-section">Leaderboard</h1></div>
      <p className="muted mt-1">Ranked by learning hours. Consistency beats cramming.</p>
      <div className="mt-6 flex gap-2 text-sm">
        {[["7", "This week"], ["30", "This month"], ["all", "All time"]].map(([v, l]) => <a key={v} href={`?range=${v}`} className={`rounded-lg px-3 py-1.5 font-medium ${range === v ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>{l}</a>)}
      </div>
      <ol className="card mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r, i) => {
          const u = byId.get(r.userId);
          return (
            <li key={r.userId} className={`flex items-center gap-4 px-5 py-3 ${me?.id === r.userId ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i === 0 ? "bg-volt-400 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>{i + 1}</span>
              <div className="flex-1"><div className="font-semibold">{u?.name}{me?.id === r.userId && " (you)"}</div><div className="muted text-xs">{u?.organization ?? ""}{u?._count.certificates ? ` · ${u._count.certificates} certificates` : ""}</div></div>
              <div className="text-right"><div className="font-bold">{hours(r._sum.seconds ?? 0)} h</div></div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="muted p-8 text-center">No activity yet in this period.</li>}
      </ol>
    </div>
  );
}
