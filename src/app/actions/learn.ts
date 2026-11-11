"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessCourse } from "@/lib/access";
import { markComplete, maybeIssueCertificate } from "@/lib/progress";
import { parseList } from "@/lib/format";

async function lessonFor(lessonId: string) {
  const user = await requireUser();
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!lesson.isPreview && !(await canAccessCourse(user, lesson.module.course))) throw new Error("No access");
  return { user, lesson, course: lesson.module.course };
}

export async function completeLesson(lessonId: string) {
  const { user, lesson, course } = await lessonFor(lessonId);
  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  // For reading lessons, credit study time if the tracker logged less than the planned duration.
  const credit = lesson.type === "READING" && !existing?.completed ? Math.max(0, Math.min(lesson.durationSec, lesson.durationSec - (existing?.watchedSeconds ?? 0))) : 0;
  await markComplete(user.id, lessonId, credit);
  const cert = await maybeIssueCertificate(user.id, course.id);
  revalidatePath(`/learn/${course.slug}`, "layout");
  return { certificate: cert?.code ?? null };
}

export type QuizResult = {
  score: number; total: number; percent: number; passed: boolean; certificate: string | null;
  review: { text: string; options: string[]; chosen: number; correct: number; explanation: string }[];
};

export async function submitQuiz(quizId: string, answers: number[]): Promise<QuizResult> {
  const quiz = await db.quiz.findUniqueOrThrow({ where: { id: quizId }, include: { questions: { orderBy: { order: "asc" } } } });
  const { user, course } = await lessonFor(quiz.lessonId);
  if (quiz.maxAttempts) {
    const n = await db.quizAttempt.count({ where: { userId: user.id, quizId } });
    if (n >= quiz.maxAttempts) throw new Error("No attempts left");
  }
  let score = 0;
  const review = quiz.questions.map((q, i) => {
    const chosen = answers[i] ?? -1;
    if (chosen === q.correctIndex) score++;
    return { text: q.text, options: parseList(q.options), chosen, correct: q.correctIndex, explanation: q.explanation };
  });
  const total = quiz.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.passPercent;
  await db.quizAttempt.create({ data: { userId: user.id, quizId, score, total, percent, passed, answers: JSON.stringify(answers) } });
  let certificate: string | null = null;
  if (passed) {
    await markComplete(user.id, quiz.lessonId, 0);
    certificate = (await maybeIssueCertificate(user.id, course.id))?.code ?? null;
  }
  revalidatePath(`/learn/${course.slug}`, "layout");
  return { score, total, percent, passed, certificate, review };
}

export async function addNote(lessonId: string, body: string, positionSec: number) {
  const { user } = await lessonFor(lessonId);
  if (!body.trim()) return null;
  return db.note.create({ data: { userId: user.id, lessonId, body: body.slice(0, 4000), positionSec: Math.round(positionSec) } });
}

export async function deleteNote(id: string) {
  const user = await requireUser();
  await db.note.deleteMany({ where: { id, userId: user.id } });
}

export async function postComment(fd: FormData) {
  const lessonId = String(fd.get("lessonId"));
  const { user, course } = await lessonFor(lessonId);
  const body = String(fd.get("body") || "").trim().slice(0, 4000);
  const parentId = String(fd.get("parentId") || "") || null;
  if (!body) return;
  await db.comment.create({ data: { userId: user.id, lessonId, body, parentId } });
  revalidatePath(`/learn/${course.slug}/${lessonId}`);
}
