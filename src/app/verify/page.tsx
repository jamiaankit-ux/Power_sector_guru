import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";

export const metadata = { title: "Verify a certificate" };

export default async function Verify({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  let notFoundMsg = false;
  if (code) {
    const c = await db.certificate.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (c) redirect(`/certificates/${c.code}`);
    notFoundMsg = true;
  }
  return (
    <div className="container-x max-w-xl py-16">
      <BadgeCheck className="h-10 w-10 text-brand-600" />
      <h1 className="h-section mt-4">Verify a certificate</h1>
      <p className="muted mt-2">Employers and institutions can confirm a Power Academy certificate using the ID printed on it.</p>
      <form className="mt-6 flex gap-2">
        <input name="code" defaultValue={code} className="input" placeholder="PA-2026-XXXXXXXX" required />
        <button className="btn-primary">Verify</button>
      </form>
      {notFoundMsg && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">No certificate found with that ID.</p>}
    </div>
  );
}
