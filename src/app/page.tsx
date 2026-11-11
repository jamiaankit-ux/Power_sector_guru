import Link from "next/link";
import { Activity, Award, BarChart3, BookOpenCheck, Download, MessageSquare, PlayCircle, Scale, ShieldCheck, Smartphone, Sun, Timer, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { courseCards } from "@/lib/catalog";
import { CourseCard } from "@/components/CourseCard";
import { TAGLINE } from "@/components/Logo";

const icons: Record<string, React.ElementType> = { zap: Zap, activity: Activity, sun: Sun, scale: Scale };

export default async function Home() {
  const [featured, categories, learners, lessonCount, certs] = await Promise.all([
    courseCards({ published: true, featured: true }),
    db.category.findMany({ include: { _count: { select: { courses: true } } } }),
    db.user.count(),
    db.lesson.count(),
    db.certificate.count(),
  ]);
  return (
    <>
      <section className="relative overflow-hidden bg-[#0b1b3f] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "radial-gradient(60% 60% at 80% 10%, #2563eb 0%, transparent 60%), radial-gradient(40% 40% at 10% 90%, #f59e0b55 0%, transparent 60%)" }} />
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-20" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden>
          {[0, 1, 2].map((i) => <path key={i} d={`M0 ${80 + i * 20} C 150 ${20 + i * 20}, 300 ${140 + i * 20}, 450 ${80 + i * 20} S 750 ${20 + i * 20}, 900 ${80 + i * 20} S 1150 ${140 + i * 20}, 1200 ${80 + i * 20}`} stroke={i === 1 ? "#fbbf24" : "#93c5fd"} strokeWidth="2" fill="none" />)}
        </svg>
        <div className="container-x relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-volt-400 ring-1 ring-white/20"><Zap className="h-3.5 w-3.5" />{TAGLINE}</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Master the power sector, <span className="text-volt-400">one lesson at a time.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100/90">Expert-led courses on power systems, grid operations, renewables, electricity markets and regulation. Learn on any device, test yourself with quizzes, and earn verifiable certificates.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className="btn-volt px-6 py-3 text-base">Explore courses</Link>
              <Link href="/register" className="btn px-6 py-3 text-base text-white ring-1 ring-white/30 hover:bg-white/10">Start free</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[["Learners", learners], ["Lessons", lessonCount], ["Certificates", certs]].map(([k, v]) => (
                <div key={k as string}><dt className="text-xs uppercase tracking-wider text-blue-200/70">{k}</dt><dd className="text-2xl font-bold">{(v as number).toLocaleString("en-IN")}</dd></div>
              ))}
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/15 backdrop-blur">
              <div className="flex items-center justify-between text-sm"><span className="font-semibold">Your progress</span><span className="text-blue-200">This week</span></div>
              <div className="mt-6 flex h-36 items-end gap-3">
                {[40, 65, 30, 80, 55, 95, 70].map((h, i) => <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-600 to-sky-400" style={{ height: `${h}%` }} />)}
              </div>
              <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-blue-200/70">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[["6.4 h", "Watch time"], ["86%", "Quiz avg"], ["12", "Day streak"]].map(([v, k]) => <div key={k} className="rounded-xl bg-white/10 p-3"><div className="text-xl font-bold">{v}</div><div className="text-[11px] text-blue-200">{k}</div></div>)}
              </div>
            </div>
            <div className="absolute -bottom-10 -left-8 flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl">
              <Award className="h-10 w-10 text-volt-500" /><div><div className="text-sm font-bold">Certificate earned</div><div className="text-xs text-slate-500">Grid Operations, Scheduling and DSM</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => {
            const Icon = icons[c.icon] ?? Zap;
            return (
              <Link key={c.id} href={`/courses?category=${c.slug}`} className="card flex items-center gap-3 p-4 hover:border-brand-500">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Icon className="h-5 w-5" /></span>
                <div><div className="font-semibold">{c.name}</div><div className="muted text-xs">{c._count.courses} courses</div></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="h-section">Featured courses</h2><p className="muted mt-1">Start with the most popular programmes.</p></div>
          <Link href="/courses" className="text-sm font-semibold text-brand-600">View all →</Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
      </section>

      <section className="container-x mt-24">
        <h2 className="h-section text-center">Everything you need to learn and prove it</h2>
        <p className="muted mx-auto mt-2 max-w-2xl text-center">A complete learning platform designed for working engineers: learn in short sessions, pick up where you left off on any device, and show verified results.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [PlayCircle, "HD video lectures", "Adjustable speed, resume where you left off, and timestamped notes."],
            [BookOpenCheck, "Study material", "Concise notes, worked examples and downloadable slides for every topic."],
            [Timer, "Quizzes and assessments", "Timed quizzes with instant feedback and explanations."],
            [BarChart3, "Performance analytics", "Watch hours, streaks, quiz scores and progress across courses."],
            [Award, "Verifiable certificates", "PDF certificates with a QR code anyone can verify online."],
            [MessageSquare, "Doubt discussion", "Ask questions on each lesson and learn from peers."],
            [Smartphone, "Any device", "Works on Android, iPhone, Windows and Mac. Install as an app."],
            [ShieldCheck, "Secure payments", "UPI, cards and net banking with discount codes and bundles."],
          ].map(([Icon, t, d]) => {
            const I = Icon as React.ElementType;
            return (
              <div key={t as string} className="card p-5">
                <I className="h-6 w-6 text-brand-600 dark:text-volt-400" />
                <div className="mt-3 font-semibold">{t as string}</div>
                <p className="muted mt-1 text-sm">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-x mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 p-8 text-white sm:p-12">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Get unlimited access with a subscription</h2>
              <p className="mt-2 text-blue-100">Every course, every new release, certificates included. Or save with curated career bundles.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="btn-volt px-6 py-3">See plans</Link>
              <Link href="/install" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10"><Download className="h-4 w-4" />Get the app</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
