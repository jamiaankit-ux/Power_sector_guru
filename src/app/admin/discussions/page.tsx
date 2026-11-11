import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { replyAsInstructor } from "@/app/actions/admin";

export default async function Discussions() {
  const comments = await db.comment.findMany({
    where: { parentId: null }, orderBy: { createdAt: "desc" }, take: 100,
    include: { user: true, lesson: { include: { module: { include: { course: true } } } }, replies: { include: { user: true } } },
  });
  return (
    <div>
      <h1 className="h-section">Learner doubts</h1>
      <p className="muted mt-1">Unanswered questions appear first.</p>
      <ul className="mt-6 space-y-3">
        {comments.sort((a, b) => Number(a.replies.length > 0) - Number(b.replies.length > 0)).map((c) => (
          <li key={c.id} className="card p-4 text-sm">
            <div className="muted text-xs"><Link className="hover:text-brand-600" href={`/learn/${c.lesson.module.course.slug}/${c.lessonId}`}>{c.lesson.module.course.title} · {c.lesson.title}</Link></div>
            <div className="mt-1"><b>{c.user.name}</b> <span className="muted text-xs">{fmtDate(c.createdAt)}</span></div>
            <p className="mt-1">{c.body}</p>
            {c.replies.map((r) => <p key={r.id} className="ml-4 mt-2 border-l-2 pl-3"><b>{r.user.name}:</b> {r.body}</p>)}
            <form action={replyAsInstructor} className="mt-3 flex gap-2"><input type="hidden" name="lessonId" value={c.lessonId} /><input type="hidden" name="parentId" value={c.id} /><input name="body" className="input py-1.5" placeholder="Reply as instructor" required /><button className="btn-primary py-1.5">Reply</button></form>
          </li>
        ))}
        {comments.length === 0 && <li className="muted">No questions yet.</li>}
      </ul>
    </div>
  );
}
