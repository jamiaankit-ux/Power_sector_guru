import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const [enrollments, lessonCounts, done, certs] = await Promise.all([
    db.enrollment.findMany({ include: { user: true, course: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    db.lesson.findMany({ select: { id: true, module: { select: { courseId: true } } } }),
    db.lessonProgress.findMany({ where: { completed: true }, select: { userId: true, lessonId: true } }),
    db.certificate.findMany({ select: { userId: true, courseId: true, code: true, revoked: true } }),
  ]);
  const courseOf = new Map(lessonCounts.map((l) => [l.id, l.module.courseId]));
  const total = new Map<string, number>();
  for (const l of lessonCounts) total.set(l.module.courseId, (total.get(l.module.courseId) ?? 0) + 1);
  const doneBy = new Map<string, number>();
  for (const p of done) { const k = `${p.userId}:${courseOf.get(p.lessonId)}`; doneBy.set(k, (doneBy.get(k) ?? 0) + 1); }
  const certBy = new Map(certs.map((c) => [`${c.userId}:${c.courseId}`, c]));
  return csvResponse("course-progress", [
    ["Learner", "Email", "Phone", "Organisation", "Course", "Enrolled", "Source", "Lessons done", "Lessons total", "Progress %", "Certificate"],
    ...enrollments.map((e) => {
      const k = `${e.userId}:${e.courseId}`, d = doneBy.get(k) ?? 0, t = total.get(e.courseId) ?? 0, c = certBy.get(k);
      return [e.user.name, e.user.email, e.user.phone, e.user.organization, e.course.title, e.createdAt.toISOString().slice(0, 10), e.source, d, t, t ? Math.round((d / t) * 100) : 0, c ? (c.revoked ? `${c.code} (revoked)` : c.code) : ""];
    }),
  ]);
}
