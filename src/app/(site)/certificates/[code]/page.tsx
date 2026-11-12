import { notFound } from "next/navigation";
import { BadgeCheck, Download, Linkedin } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await db.certificate.findUnique({ where: { code }, include: { user: true, course: true } });
  if (!c) notFound();
  if (c.revoked)
    return (
      <div className="container-x max-w-xl py-16 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="h-section mt-4">Certificate revoked</h1>
        <p className="muted mt-2">Certificate {c.code} was issued by Power Sector Academy but has since been revoked and is no longer valid. Please contact us if you believe this is a mistake.</p>
      </div>
    );
  const me = await currentUser();
  const mine = me?.id === c.userId;
  const issued = c.issuedAt;
  const linkedIn = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(c.course.title)}&organizationName=Power%20Sector%20Academy&issueYear=${issued.getFullYear()}&issueMonth=${issued.getMonth() + 1}&certId=${c.code}&certUrl=${encodeURIComponent(`${process.env.APP_URL ?? ""}/certificates/${c.code}`)}`;
  return (
    <div className="container-x py-10">
      <div className="no-print mx-auto mb-6 flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
        <BadgeCheck className="h-6 w-6" />
        <div className="flex-1 text-sm"><b>Verified certificate.</b> Issued by Power Sector Academy to {c.user.name} on {fmtDate(issued)}.</div>
        <a href={`/api/certificates/${c.code}/pdf`} className="btn-primary"><Download className="h-4 w-4" />Download PDF</a>
        {mine && <a href={linkedIn} target="_blank" rel="noopener" className="btn-ghost"><Linkedin className="h-4 w-4" />Add to LinkedIn</a>}
      </div>
      <div className="mx-auto aspect-[1.414] max-w-4xl overflow-hidden rounded-xl border-[6px] border-[#0b1b3f] bg-white text-slate-900 shadow-2xl">
        <div className="flex h-full flex-col border-2 border-volt-400 m-2">
          <div className="flex items-center justify-between bg-[#0b1b3f] px-8 py-4 text-white">
            <div><div className="text-lg font-extrabold tracking-wider">POWER SECTOR ACADEMY</div><div className="text-xs text-blue-200">Making you ready for AI-enabled Power Sector</div></div>
            <svg viewBox="0 0 32 32" className="h-10 w-10"><path d="M18 4 8 18h7l-2 10 11-15h-7l1-9z" fill="#fbbf24" /></svg>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center font-serif">
            <div className="text-xl font-bold tracking-[0.2em] text-[#0b1b3f] sm:text-3xl">CERTIFICATE OF COMPLETION</div>
            <div className="mt-3 italic text-slate-500 sm:mt-5">This is to certify that</div>
            <div className="mt-2 border-b-2 border-volt-400 px-8 pb-2 text-2xl font-bold text-brand-600 sm:text-5xl">{c.user.name}</div>
            <div className="mt-3 italic text-slate-500 sm:mt-5">has successfully completed the course</div>
            <div className="mt-2 text-lg font-bold text-[#0b1b3f] sm:text-3xl">{c.course.title}</div>
            <div className="mt-3 font-sans text-xs text-slate-500 sm:text-sm">Learning time {c.hours} h · Assessment score {c.scorePct}% · Issued {fmtDate(issued)}</div>
          </div>
          <div className="flex items-end justify-between px-8 pb-6 text-xs">
            <div><div className="border-t border-slate-400 pt-1 font-semibold">{c.course.instructorName}</div><div className="text-slate-500">Course Instructor</div></div>
            <div className="text-right"><div className="font-semibold">ID: {c.code}</div><div className="text-slate-500">Verify at /certificates/{c.code}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
