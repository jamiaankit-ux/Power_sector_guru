import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, CheckCircle2, Clock, FileText, Globe, Infinity as InfinityIcon, ListChecks, Lock, PlayCircle, Smartphone, Star } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { courseProgress } from "@/lib/progress";
import { duration, fmtDate, inr, parseList } from "@/lib/format";
import { enroll, submitReview } from "@/app/actions/course";
import { CourseCover } from "@/components/CourseCard";
import { isNativeApp } from "@/lib/app-mode";

const lessonIcon = { VIDEO: PlayCircle, READING: FileText, QUIZ: ListChecks } as Record<string, React.ElementType>;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await db.course.findUnique({ where: { slug: (await params).slug } });
  return { title: c?.title, description: c?.subtitle };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inApp = await isNativeApp();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      category: true,
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      reviews: { include: { user: { select: { name: true, designation: true } } }, orderBy: { createdAt: "desc" } },
      bundles: { include: { bundle: true } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course || (!course.published)) notFound();
  const user = await currentUser();
  const access = await canAccessCourse(user, course);
  const enrollment = user ? await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } }) : null;
  const prog = user && enrollment ? await courseProgress(user.id, course.id) : null;
  const lessons = course.modules.flatMap((m) => m.lessons);
  const total = lessons.reduce((a, l) => a + l.durationSec, 0);
  const rating = course.reviews.length ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length : 0;
  const firstLesson = lessons[0];
  const resumeId = enrollment?.lastLessonId ?? firstLesson?.id;
  const myReview = course.reviews.find((r) => user && r.user && r.userId === user.id);

  return (
    <div>
      <section className="bg-[#0b1b3f] text-white">
        <div className="container-x grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="text-sm text-blue-200"><Link href="/courses">Courses</Link> / {course.category?.name}</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-3 text-lg text-blue-100">{course.subtitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-100">
              {rating > 0 && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-volt-400 text-volt-400" /><b className="text-white">{rating.toFixed(1)}</b> ({course.reviews.length} reviews)</span>}
              <span>{course._count.enrollments.toLocaleString("en-IN")} learners</span>
              <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{course.language}</span>
              <span>Updated {fmtDate(course.updatedAt)}</span>
            </div>
            <div className="mt-4 text-sm">Created by <b>{course.instructorName}</b>{course.instructorTitle && <span className="text-blue-200">, {course.instructorTitle}</span>}</div>
          </div>
        </div>
      </section>

      <div className="container-x grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="order-2 space-y-8 py-10 lg:order-1">
          <section className="card p-6">
            <h2 className="text-xl font-bold">What you will learn</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {parseList(course.outcomes).map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{o}</li>)}
            </ul>
          </section>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-bold">Course content</h2>
              <span className="muted text-sm">{course.modules.length} modules · {lessons.length} lessons · {duration(total)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {course.modules.map((m, i) => (
                <details key={m.id} open={i === 0} className="card overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
                    <span>{i + 1}. {m.title}</span>
                    <span className="muted text-xs font-normal">{m.lessons.length} lessons · {duration(m.lessons.reduce((a, l) => a + l.durationSec, 0))}</span>
                  </summary>
                  <ul className="border-t border-slate-200 dark:border-slate-800">
                    {m.lessons.map((l) => {
                      const Icon = lessonIcon[l.type] ?? PlayCircle;
                      const open = access || l.isPreview;
                      const done = prog?.doneSet.has(l.id);
                      return (
                        <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4 text-slate-400" />}
                          {open ? <Link href={`/learn/${course.slug}/${l.id}`} className="hover:text-brand-600">{l.title}</Link> : <span>{l.title}</span>}
                          {l.isPreview && !access && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">Preview</span>}
                          <span className="muted ml-auto flex items-center gap-2 text-xs">{duration(l.durationSec)}{!open && <Lock className="h-3.5 w-3.5" />}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-bold">About this course</h2>
            <p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{course.description}</p>
            {parseList(course.requirements).length > 0 && <>
              <h3 className="mt-6 font-semibold">Requirements</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">{parseList(course.requirements).map((r) => <li key={r}>{r}</li>)}</ul>
            </>}
          </section>

          <section>
            <h2 className="text-xl font-bold">Learner reviews</h2>
            {enrollment && (
              <form action={submitReview} className="card mt-4 space-y-3 p-5">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="font-semibold">{myReview ? "Update your review" : "Rate this course"}</div>
                <select name="rating" defaultValue={myReview?.rating ?? 5} className="input w-auto">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} {n}</option>)}</select>
                <textarea name="comment" defaultValue={myReview?.comment} className="input" rows={3} placeholder="What did you find useful?" />
                <button className="btn-primary">Save review</button>
              </form>
            )}
            <div className="mt-4 space-y-3">
              {course.reviews.length === 0 && <p className="muted text-sm">No reviews yet.</p>}
              {course.reviews.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-center gap-2"><b>{r.user.name}</b><span className="muted text-xs">{r.user.designation}</span><span className="ml-auto text-volt-500">{"★".repeat(r.rating)}<span className="text-slate-300 dark:text-slate-700">{"★".repeat(5 - r.rating)}</span></span></div>
                  {r.comment && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-1 lg:order-2 lg:-mt-48">
          <div className="card sticky top-20 overflow-hidden shadow-xl">
            <CourseCover title={course.title} color={course.coverColor} category={course.category?.name} image={course.coverImage} small />
            <div className="p-6">
              {prog && (
                <div className="mb-5">
                  <div className="flex justify-between text-sm"><span className="font-semibold">Your progress</span><span>{prog.percent}%</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${prog.percent}%` }} /></div>
                </div>
              )}
              {!access && !inApp && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold">{inr(course.priceInPaise)}</span>
                  {course.mrpInPaise > course.priceInPaise && <><span className="muted line-through">{inr(course.mrpInPaise)}</span><span className="text-sm font-semibold text-emerald-600">{Math.round((1 - course.priceInPaise / course.mrpInPaise) * 100)}% off</span></>}
                </div>
              )}
              <div className="mt-4 space-y-2">
                {access && enrollment ? (
                  <Link href={`/learn/${course.slug}/${resumeId}`} className="btn-primary w-full py-3">{prog && prog.completed > 0 ? "Continue learning" : "Start course"}</Link>
                ) : access || course.priceInPaise === 0 ? (
                  <form action={enroll}><input type="hidden" name="courseId" value={course.id} /><button className="btn-primary w-full py-3">{course.priceInPaise === 0 ? "Enroll for free" : "Start with your subscription"}</button></form>
                ) : inApp ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"><Lock className="mb-1 h-4 w-4 text-slate-400" />This course is available to enrolled learners. Preview lessons are open to everyone.</div>
                ) : (
                  <>
                    <Link href={`/checkout?type=COURSE&id=${course.id}`} className="btn-primary w-full py-3">Buy now</Link>
                    <Link href="/pricing" className="btn-ghost w-full">Or get all courses with a plan</Link>
                  </>
                )}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                <li className="flex gap-2"><BookOpen className="h-4 w-4 text-slate-400" />{lessons.length} lessons, {duration(total)} total</li>
                <li className="flex gap-2"><ListChecks className="h-4 w-4 text-slate-400" />{lessons.filter((l) => l.type === "QUIZ").length} quizzes and assessments</li>
                <li className="flex gap-2"><FileText className="h-4 w-4 text-slate-400" />Downloadable study material</li>
                <li className="flex gap-2">{course.accessDays ? <Clock className="h-4 w-4 text-slate-400" /> : <InfinityIcon className="h-4 w-4 text-slate-400" />}{course.accessDays ? `${course.accessDays} days access` : "Lifetime access"}</li>
                <li className="flex gap-2"><Smartphone className="h-4 w-4 text-slate-400" />Mobile, tablet, Windows and Mac</li>
                {course.certificateEnabled && <li className="flex gap-2"><Award className="h-4 w-4 text-slate-400" />Certificate of completion</li>}
              </ul>
              {course.bundles.length > 0 && !access && !inApp && (
                <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
                  <div className="font-semibold">Save with a bundle</div>
                  {course.bundles.map(({ bundle }) => <Link key={bundle.id} href={`/pricing#${bundle.slug}`} className="mt-1 block text-brand-700 underline dark:text-volt-400">{bundle.title} · {inr(bundle.priceInPaise)}</Link>)}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
