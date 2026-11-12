import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, ListChecks, Lock, MessageSquare, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { activeSubscription, canAccessCourse, ensureEnrollment } from "@/lib/access";
import { courseProgress } from "@/lib/progress";
import { duration, parseList } from "@/lib/format";
import { headings, markdown, readingMinutes } from "@/lib/markdown";
import { Reader } from "@/components/learn/Reader";
import { postComment } from "@/app/actions/learn";
import { VideoPlayer } from "@/components/learn/VideoPlayer";
import { ReadingTracker } from "@/components/learn/ReadingTracker";
import { QuizPlayer } from "@/components/learn/QuizPlayer";
import { Notes } from "@/components/learn/Notes";
import { TutorPanel } from "@/components/learn/TutorPanel";
import { tutorEnabled } from "@/lib/tutor";

const icons = { VIDEO: PlayCircle, READING: FileText, QUIZ: ListChecks } as Record<string, React.ElementType>;

export default async function LearnPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const user = await requireUser(`/learn/${slug}/${lessonId}`);
  const course = await db.course.findUnique({
    where: { slug },
    include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
  });
  if (!course) notFound();
  const all = course.modules.flatMap((m) => m.lessons);
  const i = all.findIndex((l) => l.id === lessonId);
  if (i < 0) notFound();
  const lesson = all[i];
  const access = await canAccessCourse(user, course);
  if (!access && !lesson.isPreview) redirect(`/courses/${slug}`);

  let enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
  if (access && !enrollment) {
    const sub = await activeSubscription(user.id);
    enrollment = await ensureEnrollment(user.id, course.id, course.priceInPaise === 0 ? "FREE" : sub ? "SUBSCRIPTION" : "ADMIN", 0);
  }
  if (enrollment) await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lesson.id } });

  const [prog, lp, notes, comments, quiz, cert] = await Promise.all([
    courseProgress(user.id, course.id),
    db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } }),
    db.note.findMany({ where: { userId: user.id, lessonId }, orderBy: { positionSec: "asc" } }),
    db.comment.findMany({ where: { lessonId, parentId: null }, orderBy: { createdAt: "desc" }, take: 50,
      include: { user: { select: { name: true, role: true } }, replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, role: true } } } } } }),
    lesson.type === "QUIZ" ? db.quiz.findUnique({ where: { lessonId }, include: { questions: { orderBy: { order: "asc" } } } }) : null,
    db.certificate.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } }),
  ]);
  const tutorOn = await tutorEnabled();
  const tutorHistory = tutorOn ? await db.tutorMessage.findMany({ where: { userId: user.id, lessonId }, orderBy: { createdAt: "asc" }, take: 20 }) : [];
  const attempts = quiz ? await db.quizAttempt.findMany({ where: { userId: user.id, quizId: quiz.id } }) : [];
  const prev = all[i - 1];
  const next = all[i + 1];

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 pb-10 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3 px-4 py-3 text-sm lg:px-0 lg:pt-0">
          <Link href={`/courses/${slug}`} className="muted flex items-center gap-1 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />{course.title}</Link>
        </div>

        {lesson.type === "VIDEO" && lesson.videoUrl && (
          <VideoPlayer lessonId={lesson.id} url={lesson.videoUrl} title={lesson.title} startAt={lp?.lastPosition ?? 0} notes={notes} onCertificate={undefined} watermark={user.email ?? user.phone ?? user.name} />
        )}

        <div className="px-4 lg:px-0">
          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="muted text-xs font-semibold uppercase tracking-wider">Lesson {i + 1} of {all.length}</div>
              <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
            </div>
            {lp?.completed && <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Completed</span>}
          </div>

          {cert && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">🎓 You have completed this course. <Link className="font-semibold underline" href={`/certificates/${cert.code}`}>View certificate</Link></div>}

          {lesson.type === "QUIZ" && quiz && (
            <div className="mt-6">
              <QuizPlayer
                quizId={quiz.id}
                questions={quiz.questions.map((q) => ({ text: q.text, options: parseList(q.options) }))}
                passPercent={quiz.passPercent}
                timeLimitSec={quiz.timeLimitSec}
                attemptsLeft={quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - attempts.length) : null}
                best={attempts.length ? Math.max(...attempts.map((a) => a.percent)) : null}
              />
            </div>
          )}

          {lesson.content && (lesson.type === "READING"
            ? <Reader html={markdown(lesson.content)} toc={headings(lesson.content)} minutes={readingMinutes(lesson.content)} />
            : <article className="prose-pa mt-6 max-w-3xl" dangerouslySetInnerHTML={{ __html: markdown(lesson.content) }} />)}

          {lesson.resourceUrl && (
            <a href={lesson.resourceUrl} target="_blank" rel="noopener" className="card mt-6 flex max-w-xl items-center gap-3 p-4 hover:border-brand-500">
              <Download className="h-5 w-5 text-brand-600" /><div><div className="font-semibold">{lesson.resourceName || "Download study material"}</div><div className="muted text-xs">PDF / slides</div></div>
            </a>
          )}

          {lesson.type === "READING" && <ReadingTracker lessonId={lesson.id} completed={!!lp?.completed} />}
          {lesson.type === "READING" && (
            <div className="mt-8 max-w-3xl"><h3 className="mb-3 font-semibold">My notes</h3><Notes lessonId={lesson.id} initial={notes} /></div>
          )}

          <div className="mt-10 flex justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            {prev ? <Link href={`/learn/${slug}/${prev.id}`} className="btn-ghost"><ArrowLeft className="h-4 w-4" />Previous</Link> : <span />}
            {next && <Link href={`/learn/${slug}/${next.id}`} className="btn-primary">Next lesson<ArrowRight className="h-4 w-4" /></Link>}
          </div>

          {tutorOn && <TutorPanel lessonId={lesson.id} initial={tutorHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))} />}

          <section className="mt-10 max-w-3xl">
            <h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare className="h-5 w-5" />Questions and discussion</h2>
            <form action={postComment} className="mt-4 space-y-2">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <textarea name="body" required rows={3} className="input" placeholder="Ask a doubt or share an insight about this lesson" />
              <button className="btn-primary">Post</button>
            </form>
            <ul className="mt-6 space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="card p-4">
                  <div className="flex items-center gap-2 text-sm"><b>{c.user.name}</b>{c.user.role !== "STUDENT" && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">Instructor</span>}<span className="muted text-xs">{c.createdAt.toLocaleDateString("en-IN")}</span></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                  {c.replies.map((r) => (
                    <div key={r.id} className="ml-4 mt-3 border-l-2 border-slate-200 pl-3 text-sm dark:border-slate-700">
                      <div className="flex items-center gap-2"><b>{r.user.name}</b>{r.user.role !== "STUDENT" && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">Instructor</span>}</div>
                      <p className="mt-0.5 whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}
                  <details className="mt-2 text-sm"><summary className="cursor-pointer text-brand-600">Reply</summary>
                    <form action={postComment} className="mt-2 flex gap-2"><input type="hidden" name="lessonId" value={lesson.id} /><input type="hidden" name="parentId" value={c.id} /><input name="body" required className="input" /><button className="btn-ghost">Send</button></form>
                  </details>
                </li>
              ))}
              {comments.length === 0 && <li className="muted text-sm">No questions yet. Be the first to ask.</li>}
            </ul>
          </section>
        </div>
      </div>

      <aside className="border-t border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="font-semibold">Course progress</div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${prog.percent}%` }} /></div>
          <div className="muted mt-1 text-xs">{prog.completed} of {prog.total} lessons · {prog.percent}%</div>
        </div>
        {course.modules.map((m, mi) => (
          <div key={m.id}>
            <div className="bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">{mi + 1}. {m.title}</div>
            <ul>
              {m.lessons.map((l) => {
                const Icon = icons[l.type] ?? PlayCircle;
                const done = prog.doneSet.has(l.id);
                const open = access || l.isPreview;
                const active = l.id === lesson.id;
                const inner = (
                  <>
                    {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : open ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="flex-1">{l.title}</span><span className="muted text-xs">{duration(l.durationSec)}</span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {open ? <Link href={`/learn/${slug}/${l.id}`} className={`flex gap-3 px-5 py-3 text-sm ${active ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-100" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>{inner}</Link>
                      : <div className="flex gap-3 px-5 py-3 text-sm opacity-60">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}
