import Link from "next/link";
import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { toggleCertificate } from "@/app/actions/admin";

export const metadata = { title: "Certificates" };

export default async function AdminCertificates({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireFullAdmin();
  const { q } = await searchParams;
  const certs = await db.certificate.findMany({
    where: q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { user: { name: { contains: q, mode: "insensitive" } } }, { user: { email: { contains: q, mode: "insensitive" } } }, { course: { title: { contains: q, mode: "insensitive" } } }] } : {},
    include: { user: { select: { id: true, name: true, email: true, phone: true } }, course: { select: { title: true } } },
    orderBy: { issuedAt: "desc" }, take: 200,
  });
  return (
    <div>
      <h1 className="h-section">Certificates</h1>
      <p className="muted mt-1 text-sm">Every certificate has a public verification page. Revoke one if it was issued in error; its page will then show it as invalid.</p>
      <form className="mt-4 flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="Search ID, learner or course" /><button className="btn-primary">Search</button></form>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Certificate</th><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>{certs.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-mono text-xs"><Link className="text-brand-600" href={`/certificates/${c.code}`}>{c.code}</Link></td>
              <td className="px-4 py-3"><Link href={`/admin/users/${c.user.id}`} className="hover:text-brand-600">{c.user.name}</Link><div className="muted text-xs">{c.user.email ?? c.user.phone}</div></td>
              <td className="px-4 py-3">{c.course.title}</td><td className="px-4 py-3 text-xs">{fmtDate(c.issuedAt)}</td><td className="px-4 py-3">{c.scorePct}%</td>
              <td className="px-4 py-3"><form action={toggleCertificate} className="flex items-center gap-2"><input type="hidden" name="id" value={c.id} />
                {c.revoked ? <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Revoked</span> : <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Valid</span>}
                <button className="text-xs text-brand-600 underline">{c.revoked ? "Restore" : "Revoke"}</button></form></td>
            </tr>
          ))}
          {certs.length === 0 && <tr><td colSpan={6} className="muted px-4 py-4">No certificates found.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
