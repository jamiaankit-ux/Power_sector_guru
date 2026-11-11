import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { postAnnouncement } from "@/app/actions/admin";

export default async function Announcements() {
  const list = await db.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="h-section">Announcements</h1>
      <p className="muted mt-1">Shown on every learner&apos;s dashboard.</p>
      <form action={postAnnouncement} className="card mt-6 space-y-3 p-6"><input name="title" className="input" placeholder="Title" required /><textarea name="body" className="input" rows={3} placeholder="Message" required /><button className="btn-primary">Publish</button></form>
      <ul className="mt-6 space-y-3">{list.map((a) => <li key={a.id} className="card p-4"><div className="font-semibold">{a.title}</div><p className="muted text-sm">{a.body}</p><div className="muted mt-1 text-xs">{fmtDate(a.createdAt)}</div></li>)}</ul>
    </div>
  );
}
