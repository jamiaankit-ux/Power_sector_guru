import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { tutorDailyLimit, tutorEnabled } from "@/lib/tutor";

export const metadata = { title: "AI assistant" };

export default async function TutorAdmin() {
  await requireFullAdmin();
  const since = new Date(Date.now() - 30 * 86400_000);
  const [questions, count, learners] = await Promise.all([
    db.tutorMessage.findMany({ where: { role: "user" }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.tutorMessage.count({ where: { role: "user", createdAt: { gte: since } } }),
    db.tutorMessage.groupBy({ by: ["userId"], where: { role: "user", createdAt: { gte: since } } }),
  ]);
  const [users, lessons] = await Promise.all([
    db.user.findMany({ where: { id: { in: [...new Set(questions.map((q) => q.userId))] } }, select: { id: true, name: true } }),
    db.lesson.findMany({ where: { id: { in: [...new Set(questions.map((q) => q.lessonId))] } }, select: { id: true, title: true } }),
  ]);
  const uName = new Map(users.map((u) => [u.id, u.name]));
  const lTitle = new Map(lessons.map((l) => [l.id, l.title]));
  return (
    <div>
      <h1 className="h-section">AI study assistant</h1>
      <p className="muted mt-1 text-sm">{tutorEnabled() ? `On. Each learner can ask up to ${tutorDailyLimit()} questions a day (change with TUTOR_DAILY_LIMIT).` : "Off. Add ANTHROPIC_API_KEY on Render to switch it on."} What learners ask shows you where lessons need more explanation.</p>
      <div className="mt-4 flex gap-4 text-sm"><span className="chip">{count} questions in 30 days</span><span className="chip">{learners.length} learners used it</span></div>
      <ul className="card mt-6 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {questions.map((q) => (
          <li key={q.id} className="px-5 py-3"><div className="muted text-xs">{uName.get(q.userId) ?? "Learner"} · {lTitle.get(q.lessonId) ?? "Lesson"} · {q.createdAt.toLocaleDateString("en-IN")}</div><div className="mt-0.5 whitespace-pre-wrap">{q.content}</div></li>
        ))}
        {questions.length === 0 && <li className="muted px-5 py-4">No questions yet.</li>}
      </ul>
    </div>
  );
}
