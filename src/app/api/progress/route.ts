import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCourse } from "@/lib/access";
import { maybeIssueCertificate, recordWatch } from "@/lib/progress";

/** Player heartbeat: adds watched seconds and saves the resume position. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { lessonId, seconds, position, duration } = await req.json();
  const lesson = await db.lesson.findUnique({ where: { id: String(lessonId) }, include: { module: { include: { course: true } } } });
  if (!lesson) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!lesson.isPreview && !(await canAccessCourse(user, lesson.module.course))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const r = await recordWatch(user.id, lesson.id, Number(seconds) || 0, Number(position) || 0, Number(duration) || 0);
  const cert = r.completed ? await maybeIssueCertificate(user.id, lesson.module.courseId) : null;
  return NextResponse.json({ completed: r.completed, certificate: cert?.code ?? null });
}
