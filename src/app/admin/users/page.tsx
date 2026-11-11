import { db } from "@/lib/db";
import { fmtDate, hours } from "@/lib/format";
import { grantAccess, setRole } from "@/app/actions/admin";

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [users, courses] = await Promise.all([
    db.user.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }, { organization: { contains: q } }] } : {},
      include: { _count: { select: { enrollments: true, certificates: true } }, activity: { select: { seconds: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
    db.course.findMany({ orderBy: { title: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="h-section">Learners</h1>
      <form className="mt-4 flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="Search name, email, phone, organisation" /><button className="btn-primary">Search</button></form>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Organisation</th><th className="px-4 py-3">Courses</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Last active</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Give access</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100 align-top dark:border-slate-800">
              <td className="px-4 py-3"><div className="font-medium">{u.name}</div><div className="muted text-xs">{u.email}{u.email && u.phone && " · "}{u.phone}</div></td>
              <td className="px-4 py-3 text-xs">{u.organization}<div className="muted">{u.designation}</div></td>
              <td className="px-4 py-3">{u._count.enrollments} <span className="muted text-xs">({u._count.certificates} certs)</span></td>
              <td className="px-4 py-3">{hours(u.activity.reduce((a, x) => a + x.seconds, 0))}</td>
              <td className="px-4 py-3 text-xs">{fmtDate(u.lastActiveAt)}</td>
              <td className="px-4 py-3"><form action={setRole} className="flex gap-1"><input type="hidden" name="id" value={u.id} /><select name="role" defaultValue={u.role} className="input w-auto py-1 text-xs"><option>STUDENT</option><option>INSTRUCTOR</option><option>ADMIN</option></select><button className="btn-ghost px-2 py-1 text-xs">Set</button></form></td>
              <td className="px-4 py-3"><form action={grantAccess} className="flex gap-1"><input type="hidden" name="userId" value={u.id} /><select name="courseId" className="input w-40 py-1 text-xs"><option value="">Course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="btn-ghost px-2 py-1 text-xs">Grant</button></form></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
