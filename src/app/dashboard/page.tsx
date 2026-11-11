import Link from "next/link";
import { Award, BookOpen, Clock, Flame, Megaphone, Target, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { activeSubscription } from "@/lib/access";
import { courseProgress, streak } from "@/lib/progress";
import { dayKey, fmtDate, hours } from "@/lib/format";
import { ActivityChart } from "@/components/ActivityChart";
import { CourseCover } from "@/components/CourseCard";

export const metadata = { title: "My learning" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireUser("/dashboard");
  const [enrollments, activity, attempts, certs, sub, announcements, streakDays] = await Promise.all([
    db.enrollment.findMany({ where: { userId: user.id }, include: { course: true }, orderBy: { createdAt: "desc" } }),
    db.dailyActivity.findMany({ where: { userId: user.id } }),
    db.quizAttempt.findMany({ where: { userId: user.id }, include: { quiz: { include: { lesson: { include: { module: { include: { course: true } } } } } } }, orderBy: { createdAt: "desc" } }),
    db.certificate.findMany({ where: { userId: user.id }, include: { course: true } }),
    activeSubscription(user.id),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    streak(user.id),
  ]);
  const progress = await Promise.all(enrollments.map(async (e) => ({ e, p: await courseProgress(user.id, e.courseId) })));
  const totalSec = activity.reduce((a, d) => a + d.seconds, 0);
  const byDay = new Map(activity.map((a) => [a.day, a.seconds]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const k = dayKey(d);
    return { day: k, minutes: Math.round((byDay.get(k) ?? 0) / 60) };
  });
  const weekMin = days.slice(-7).reduce((a, d) => a + d.minutes, 0);
  const avgQuiz = attempts.length ? Math.round(attempts.reduce((a, x) => a + x.percent, 0) / attempts.length) : 0;
  const completed = progress.filter(({ p }) => p.total > 0 && p.completed === p.total).length;
  const inProgress = progress.filter(({ p }) => p.completed < p.total);

  const stats = [
    { icon: Clock, label: "Total watch hours", value: hours(totalSec), hint: `${weekMin} min this week` },
    { icon: BookOpen, label: "Courses", value: `${completed}/${enrollments.length}`, hint: "completed / enrolled" },
    { icon: Target, label: "Average quiz score", value: attempts.length ? `${avgQuiz}%` : "–", hint: `${attempts.length} attempts` },
    { icon: Flame, label: "Learning streak", value: `${streakDays} day${streakDays === 1 ? "" : "s"}`, hint: "Learn daily to keep it going" },
    { icon: Award, label: "Certificates", value: String(certs.length), hint: "earned" },
  ];

  return (
    <div className="container-x py-8">
      {welcome && <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white"><div className="text-xl font-bold">Welcome to Power Sector Academy, {user.name.split(" ")[0]}! ⚡</div><p className="mt-1 text-blue-100">Start with our free Power System Fundamentals course, or browse the full catalogue.</p><Link href="/courses" className="btn-volt mt-4">Browse courses</Link></div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-section">Hi {user.name.split(" ")[0]}, keep the current flowing</h1>
          <p className="muted mt-1">{user.designation ? `${user.designation}${user.organization ? `, ${user.organization}` : ""}` : "Your learning performance at a glance"}</p>
        </div>
        {sub ? <span className="chip bg-emerald-50 py-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{sub.plan.name} plan active until {fmtDate(sub.currentPeriodEnd)}</span>
          : <Link href="/pricing" className="hide-in-app btn-ghost">Unlock all courses</Link>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="card p-5">
            <Icon className="h-5 w-5 text-brand-600 dark:text-volt-400" />
            <div className="mt-3 text-2xl font-extrabold">{value}</div>
            <div className="text-sm font-medium">{label}</div>
            <div className="muted text-xs">{hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-6">
          <div className="flex items-center gap-2 font-semibold"><TrendingUp className="h-5 w-5" />Daily learning minutes</div>
          <div className="mt-4"><ActivityChart days={days} /></div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 font-semibold"><Megaphone className="h-5 w-5" />Announcements</div>
          <ul className="mt-4 space-y-4">
            {announcements.map((a) => <li key={a.id}><div className="text-sm font-semibold">{a.title}</div><p className="muted text-sm">{a.body}</p><div className="muted mt-1 text-xs">{fmtDate(a.createdAt)}</div></li>)}
            {announcements.length === 0 && <li className="muted text-sm">Nothing new.</li>}
          </ul>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold">Continue learning</h2>
      {enrollments.length === 0 ? (
        <div className="card mt-4 p-10 text-center"><p className="muted">You have not enrolled in any course yet.</p><Link href="/courses" className="btn-primary mt-4">Find a course</Link></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(inProgress.length ? inProgress : progress).map(({ e, p }) => (
            <Link key={e.id} href={e.lastLessonId ? `/learn/${e.course.slug}/${e.lastLessonId}` : `/courses/${e.course.slug}`} className="card overflow-hidden hover:shadow-lg">
              <CourseCover title={e.course.title} color={e.course.coverColor} image={e.course.coverImage} small />
              <div className="p-4">
                <div className="font-semibold">{e.course.title}</div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${p.percent}%` }} /></div>
                <div className="muted mt-2 flex justify-between text-xs"><span>{p.completed}/{p.total} lessons · {p.percent}%</span><span>{hours(p.watchedSeconds)} h watched</span></div>
                {e.expiresAt && <div className="muted mt-1 text-xs">Access until {fmtDate(e.expiresAt)}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="p-5 font-semibold">Course performance</div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-5 py-2">Course</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Quiz avg</th></tr></thead>
            <tbody>{progress.map(({ e, p }) => (
              <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-5 py-3">{e.course.title}</td><td className="px-3 py-3">{p.percent}%</td><td className="px-3 py-3">{hours(p.watchedSeconds)}</td><td className="px-3 py-3">{p.quizzesTaken ? `${p.quizAvgTaken}% (${p.quizzesTaken}/${p.quizCount})` : "–"}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
        <div className="card overflow-hidden">
          <div className="p-5 font-semibold">Recent quiz attempts</div>
          <ul>
            {attempts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
                <span className={`grid h-10 w-12 place-items-center rounded-lg text-xs font-bold ${a.passed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`}>{a.percent}%</span>
                <div className="flex-1"><div className="font-medium">{a.quiz.lesson.title}</div><div className="muted text-xs">{a.quiz.lesson.module.course.title}</div></div>
                <span className="muted text-xs">{fmtDate(a.createdAt)}</span>
              </li>
            ))}
            {attempts.length === 0 && <li className="muted px-5 pb-5 text-sm">No quizzes taken yet.</li>}
          </ul>
        </div>
      </div>

      {certs.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold">Your certificates</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => <Link key={c.id} href={`/certificates/${c.code}`} className="card flex items-center gap-3 p-4 hover:border-brand-500"><Award className="h-8 w-8 text-volt-500" /><div><div className="font-semibold">{c.course.title}</div><div className="muted text-xs">Issued {fmtDate(c.issuedAt)} · {c.code}</div></div></Link>)}
          </div>
        </>
      )}
    </div>
  );
}
