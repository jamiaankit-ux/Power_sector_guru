import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { rateLimit } from "@/lib/ratelimit";
import { askTutor, tutorDailyLimit, tutorEnabled } from "@/lib/tutor";

export async function POST(req: Request) {
  if (!tutorEnabled()) return NextResponse.json({ error: "The AI assistant is not switched on yet." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const lessonId = String(body.lessonId ?? "");
  const question = String(body.question ?? "").trim().slice(0, 2000);
  if (!question) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  const course = lesson.module.course;
  if (!lesson.isPreview && !(await canAccessCourse(user, course))) return NextResponse.json({ error: "Enroll in this course to use the assistant." }, { status: 403 });
  const day = new Date().toISOString().slice(0, 10);
  if (user.role === "STUDENT" && !(await rateLimit(`tutor:${user.id}:${day}`, tutorDailyLimit(), 86400)))
    return NextResponse.json({ error: `You have used today's ${tutorDailyLimit()} questions. The limit resets tomorrow.` }, { status: 429 });

  const history = await db.tutorMessage.findMany({ where: { userId: user.id, lessonId }, orderBy: { createdAt: "desc" }, take: 8 });
  const res = await askTutor({
    courseTitle: course.title,
    lessonTitle: lesson.title,
    lessonText: lesson.content || "",
    history: history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    question,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
  await db.tutorMessage.createMany({ data: [{ userId: user.id, lessonId, role: "user", content: question }, { userId: user.id, lessonId, role: "assistant", content: res.text }] });
  return NextResponse.json({ answer: res.text });
}
