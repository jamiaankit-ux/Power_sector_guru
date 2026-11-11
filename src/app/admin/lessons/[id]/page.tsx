import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { parseList } from "@/lib/format";
import { addQuestion, deleteQuestion, importQuestions, saveLesson } from "@/app/actions/admin";
import { UploadField } from "@/components/admin/UploadField";

export default async function EditLesson({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ imported?: string }> }) {
  const { id } = await params;
  const { imported } = await searchParams;
  const me = await requireAdmin();
  const l = await db.lesson.findUnique({ where: { id }, include: { module: { include: { course: true } }, quiz: { include: { questions: { orderBy: { order: "asc" } } } } } });
  if (!l) notFound();
  if (me.role !== "ADMIN" && l.module.course.ownerId !== me.id) redirect("/admin/courses");
  // Per-question analytics: how often learners pick a wrong answer.
  const attempts = l.quiz ? await db.quizAttempt.findMany({ where: { quizId: l.quiz.id }, select: { answers: true } }) : [];
  const wrong = new Map<string, number>();
  if (l.quiz) for (const a of attempts) {
    const ans = (() => { try { return JSON.parse(a.answers) as number[]; } catch { return []; } })();
    l.quiz.questions.forEach((q, i) => { if (ans[i] !== q.correctIndex) wrong.set(q.id, (wrong.get(q.id) ?? 0) + 1); });
  }
  return (
    <div>
      <Link href={`/admin/courses/${l.module.courseId}`} className="muted text-sm">← {l.module.course.title}</Link>
      <h1 className="h-section">{l.title}</h1>
      <span className="chip mt-2">{l.type === "READING" ? "Study material" : l.type.toLowerCase()}</span>

      <form action={saveLesson} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={l.id} />
        <div className="sm:col-span-2"><label className="label">Title</label><input name="title" defaultValue={l.title} className="input" required /></div>
        {l.type === "VIDEO" && (
          <div className="sm:col-span-2"><label className="label">Video link</label><input name="videoUrl" defaultValue={l.videoUrl ?? ""} className="input" placeholder="MP4 link from your storage/CDN, or a YouTube (unlisted) link" />
            <p className="muted mt-1 text-xs">Recommended: upload to a video host (Bunny Stream, Cloudflare Stream, Vimeo, AWS S3 + CloudFront) and paste the MP4 link here. YouTube links also work with watch-time tracking.</p></div>
        )}
        <div><label className="label">Duration (minutes)</label><input name="durationMin" type="number" min="0" step="0.5" defaultValue={l.durationSec / 60} className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="isPreview" defaultChecked={l.isPreview} />Free preview for everyone</label>
        {l.type === "QUIZ" && <>
          <div><label className="label">Pass mark (%)</label><input name="passPercent" type="number" defaultValue={l.quiz?.passPercent ?? 60} className="input" /></div>
          <div><label className="label">Time limit (minutes, 0 = none)</label><input name="timeLimitMin" type="number" step="0.5" defaultValue={(l.quiz?.timeLimitSec ?? 0) / 60} className="input" /></div>
          <div><label className="label">Max attempts (0 = unlimited)</label><input name="maxAttempts" type="number" defaultValue={l.quiz?.maxAttempts ?? 0} className="input" /></div>
        </>}
        <div className="sm:col-span-2"><label className="label">{l.type === "READING" ? "Study material (Markdown)" : "Notes shown below the lesson (Markdown)"}</label>
          <textarea name="content" rows={l.type === "READING" ? 16 : 6} defaultValue={l.content} className="input font-mono text-[13px]" />
          <p className="muted mt-1 text-xs">Supports # headings, **bold**, lists, | tables |, &gt; key takeaways and links.</p></div>
        <div><label className="label">Downloadable file (PDF, slides)</label><UploadField name="resourceUrl" defaultValue={l.resourceUrl} accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.zip,image/*" placeholder="https://… or upload" /></div>
        <div><label className="label">File label</label><input name="resourceName" defaultValue={l.resourceName ?? ""} className="input" placeholder="Lecture slides (PDF)" /></div>
        <div className="sm:col-span-2"><button className="btn-primary">Save lesson</button></div>
      </form>

      {l.type === "QUIZ" && l.quiz && (
        <>
          <h2 className="mt-10 text-xl font-bold">Questions ({l.quiz.questions.length})</h2>
          {attempts.length > 0 && <p className="muted mt-1 text-sm">{attempts.length} attempts so far. The red figure shows how often learners got each question wrong, so you can spot confusing questions.</p>}
          {imported && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Imported {imported} questions.</p>}
          <ol className="mt-4 space-y-3">
            {l.quiz.questions.map((q, i) => (
              <li key={q.id} className="card p-4 text-sm">
                <div className="flex gap-2"><b className="flex-1">{i + 1}. {q.text}</b>{attempts.length > 0 && <span className={`chip ${(wrong.get(q.id) ?? 0) / attempts.length > 0.5 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : ""}`}>{Math.round(((wrong.get(q.id) ?? 0) / attempts.length) * 100)}% wrong</span>}
                  <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="lessonId" value={l.id} /><button className="text-slate-400 hover:text-rose-600" aria-label="Delete question"><Trash2 className="h-4 w-4" /></button></form></div>
                <ul className="mt-2 space-y-1">{parseList(q.options).map((o, j) => <li key={j} className={j === q.correctIndex ? "font-semibold text-emerald-600" : "muted"}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul>
                {q.explanation && <p className="muted mt-2 text-xs">Explanation: {q.explanation}</p>}
              </li>
            ))}
          </ol>
          <form action={addQuestion} className="card mt-4 grid gap-3 p-6 sm:grid-cols-2">
            <input type="hidden" name="quizId" value={l.quiz.id} /><input type="hidden" name="lessonId" value={l.id} />
            <div className="sm:col-span-2"><label className="label">Question</label><input name="text" className="input" required /></div>
            {[0, 1, 2, 3].map((i) => <div key={i}><label className="label">Option {String.fromCharCode(65 + i)}</label><input name={`opt${i}`} className="input" required={i < 2} /></div>)}
            <div><label className="label">Correct option</label><select name="correct" className="input">{[0, 1, 2, 3].map((i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></div>
            <div><label className="label">Explanation (shown after submitting)</label><input name="explanation" className="input" /></div>
            <div className="sm:col-span-2"><button className="btn-primary">Add question</button></div>
          </form>
          <form action={importQuestions} className="card mt-4 space-y-3 p-6">
            <input type="hidden" name="quizId" value={l.quiz.id} /><input type="hidden" name="lessonId" value={l.id} />
            <div className="font-semibold">Bulk import from Excel / CSV</div>
            <p className="muted text-sm">Save your sheet as CSV with these columns: <code>question, option A, option B, option C, option D, correct (A–D), explanation</code>. A header row is fine.</p>
            <input type="file" name="file" accept=".csv,text/csv" className="input" />
            <textarea name="csv" rows={3} className="input font-mono text-xs" placeholder={'Or paste rows here, e.g.\n"What is India\'s grid frequency?",50 Hz,60 Hz,45 Hz,55 Hz,A,"India runs at 50 Hz"'} />
            <button className="btn-ghost">Import questions</button>
          </form>
        </>
      )}
    </div>
  );
}
