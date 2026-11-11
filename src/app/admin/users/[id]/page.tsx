import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { courseProgress } from "@/lib/progress";
import { fmtDate, hours, inr } from "@/lib/format";
import { adminResetPassword, grantAccess, revokeAccess, setRole } from "@/app/actions/admin";

export default async function LearnerProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ temp?: string }> }) {
  await requireFullAdmin();
  const { id } = await params;
  const { temp } = await searchParams;
  const u = await db.user.findUnique({
    where: { id },
    include: {
      enrollments: { include: { course: true }, orderBy: { createdAt: "desc" } },
      certificates: { include: { course: { select: { title: true } } } },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      attempts: { include: { quiz: { include: { lesson: { select: { title: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 },
      activity: { orderBy: { day: "desc" } },
    },
  });
  if (!u) notFound();
  const courses = await db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } });
  const progress = await Promise.all(u.enrollments.map((e) => courseProgress(u.id, e.courseId)));
  const totalSec = u.activity.reduce((a, d) => a + d.seconds, 0);
  return (
    <div>
      <Link href="/admin/users" className="muted text-sm">← Learners</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h-section">{u.name}</h1>
          <p className="muted text-sm">{[u.email, u.phone].filter(Boolean).join(" · ")}</p>
          <p className="muted text-sm">{[u.designation, u.organization, u.city].filter(Boolean).join(", ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={setRole} className="flex gap-1"><input type="hidden" name="id" value={u.id} /><select name="role" defaultValue={u.role} className="input w-auto py-1.5 text-sm"><option>STUDENT</option><option>INSTRUCTOR</option><option>ADMIN</option></select><button className="btn-ghost py-1.5">Set role</button></form>
          <form action={adminResetPassword}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost py-1.5"><KeyRound className="h-4 w-4" />Reset password</button></form>
        </div>
      </div>
      {temp && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">New temporary password: <b className="font-mono text-base">{temp}</b>. Share it with the learner privately and ask them to change it from their profile. It won't be shown again.</div>}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Joined", fmtDate(u.createdAt)], ["Last active", fmtDate(u.lastActiveAt)], ["Watch hours", hours(totalSec)], ["Active days", String(u.activity.length)]].map(([k, v]) => <div key={k} className="card p-4"><div className="muted text-xs">{k}</div><div className="text-xl font-bold">{v}</div></div>)}
      </div>

      <h2 className="mt-8 text-lg font-bold">Courses</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-2">Course</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Progress</th><th className="px-4 py-2">Quiz avg</th><th className="px-4 py-2">Access until</th><th className="px-4 py-2" /></tr></thead>
          <tbody>{u.enrollments.map((e, i) => (
            <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2">{e.course.title}</td><td className="px-4 py-2 text-xs">{e.source}</td>
              <td className="px-4 py-2">{progress[i].percent}% <span className="muted text-xs">({progress[i].completed}/{progress[i].total})</span></td>
              <td className="px-4 py-2">{progress[i].quizzesTaken ? `${progress[i].quizAvgTaken}%` : "–"}</td>
              <td className="px-4 py-2 text-xs">{e.expiresAt ? fmtDate(e.expiresAt) : "Lifetime"}</td>
              <td className="px-4 py-2"><form action={revokeAccess}><input type="hidden" name="id" value={e.id} /><button className="text-slate-400 hover:text-rose-600" title="Remove access"><Trash2 className="h-4 w-4" /></button></form></td>
            </tr>
          ))}
          {u.enrollments.length === 0 && <tr><td className="muted px-4 py-3" colSpan={6}>Not enrolled in any course yet.</td></tr>}</tbody>
        </table>
      </div>
      <form action={grantAccess} className="mt-3 flex max-w-lg gap-2"><input type="hidden" name="userId" value={u.id} /><select name="courseId" className="input"><option value="">Give free access to a course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="btn-primary shrink-0">Grant</button></form>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold">Recent quiz attempts</h2>
          <ul className="card mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {u.attempts.map((a) => <li key={a.id} className="flex justify-between px-4 py-2"><span>{a.quiz.lesson.title}</span><span className={a.passed ? "text-emerald-600" : "text-rose-600"}>{a.percent}% · <span className="muted">{fmtDate(a.createdAt)}</span></span></li>)}
            {u.attempts.length === 0 && <li className="muted px-4 py-3">No attempts yet.</li>}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-bold">Orders and certificates</h2>
          <ul className="card mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {u.orders.map((o) => <li key={o.id} className="flex justify-between px-4 py-2"><span>{o.itemTitle}</span><span>{inr(o.total)} · {o.status}</span></li>)}
            {u.certificates.map((c) => <li key={c.id} className="flex justify-between px-4 py-2"><span>🎓 {c.course.title}</span><Link className="text-brand-600" href={`/certificates/${c.code}`}>{c.code}{c.revoked && " (revoked)"}</Link></li>)}
            {u.orders.length + u.certificates.length === 0 && <li className="muted px-4 py-3">None yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
