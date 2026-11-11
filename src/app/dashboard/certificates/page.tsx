import Link from "next/link";
import { Award, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Certificates" };

export default async function Certs() {
  const user = await requireUser();
  const certs = await db.certificate.findMany({ where: { userId: user.id }, include: { course: true }, orderBy: { issuedAt: "desc" } });
  return (
    <div className="container-x py-8">
      <h1 className="h-section">My certificates</h1>
      <p className="muted mt-1">Complete every lesson and reach the pass mark in quizzes to earn a certificate.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {certs.map((c) => (
          <div key={c.id} className="card flex items-center gap-4 p-5">
            <Award className="h-10 w-10 shrink-0 text-volt-500" />
            <div className="flex-1"><div className="font-semibold">{c.course.title}</div><div className="muted text-xs">Issued {fmtDate(c.issuedAt)} · ID {c.code} · Score {c.scorePct}%</div></div>
            <Link className="btn-ghost" href={`/certificates/${c.code}`}>View</Link>
            <a className="btn-primary" href={`/api/certificates/${c.code}/pdf`}><Download className="h-4 w-4" /></a>
          </div>
        ))}
        {certs.length === 0 && <div className="card p-10 text-center sm:col-span-2"><p className="muted">No certificates yet.</p><Link href="/dashboard" className="btn-primary mt-4">Continue learning</Link></div>}
      </div>
    </div>
  );
}
