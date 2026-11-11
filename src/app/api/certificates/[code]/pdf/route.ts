import { db } from "@/lib/db";
import { certificatePdf } from "@/lib/certificate-pdf";
import { fmtDate } from "@/lib/format";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await db.certificate.findUnique({ where: { code }, include: { user: true, course: true } });
  if (!c || c.revoked) return new Response("Not found", { status: 404 });
  const base = process.env.APP_URL || new URL(req.url).origin;
  const bytes = await certificatePdf({
    code: c.code, name: c.user.name, course: c.course.title, instructor: c.course.instructorName,
    issued: fmtDate(c.issuedAt), hours: c.hours, score: c.scorePct, verifyUrl: `${base}/certificates/${c.code}`,
  });
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${c.code}.pdf"` },
  });
}
