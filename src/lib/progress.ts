import "server-only";
import { randomBytes } from "crypto";
import { db } from "./db";
import { dayKey } from "./format";

export async function courseProgress(userId: string, courseId: string) {
  const lessons = await db.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true, type: true, durationSec: true, quiz: { select: { id: true } } },
  });
  const progress = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
  });
  const done = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
  const watched = progress.reduce((a, p) => a + p.watchedSeconds, 0);
  const quizIds = lessons.flatMap((l) => (l.quiz ? [l.quiz.id] : []));
  const attempts = quizIds.length
    ? await db.quizAttempt.findMany({ where: { userId, quizId: { in: quizIds } } })
    : [];
  const bestByQuiz = new Map<string, number>();
  for (const a of attempts) bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.percent));
  const quizAvg = quizIds.length
    ? Math.round(quizIds.reduce((s, q) => s + (bestByQuiz.get(q) ?? 0), 0) / quizIds.length)
    : 100;
  return {
    total: lessons.length,
    completed: done.size,
    percent: lessons.length ? Math.round((done.size / lessons.length) * 100) : 0,
    watchedSeconds: watched,
    quizAvg,
    quizzesTaken: bestByQuiz.size,
    // Average over quizzes actually attempted (for display). quizAvg counts untaken quizzes as 0 (for certificate rules).
    quizAvgTaken: bestByQuiz.size ? Math.round([...bestByQuiz.values()].reduce((a, b) => a + b, 0) / bestByQuiz.size) : 0,
    quizCount: quizIds.length,
    doneSet: done,
  };
}

/** Records learning time from the player heartbeat. */
export async function recordWatch(userId: string, lessonId: string, seconds: number, position: number, duration: number) {
  const s = Math.max(0, Math.min(seconds, 120)); // cap per heartbeat to stop abuse
  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const watched = (existing?.watchedSeconds ?? 0) + s;
  // A video counts as complete once 90% has been watched or the end is reached.
  const autoComplete = duration > 0 && (position >= duration * 0.9 || watched >= duration * 0.9);
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { watchedSeconds: watched, lastPosition: Math.round(position), completed: existing?.completed || autoComplete },
    create: { userId, lessonId, watchedSeconds: s, lastPosition: Math.round(position), completed: autoComplete },
  });
  if (s > 0) {
    const day = dayKey();
    await db.dailyActivity.upsert({
      where: { userId_day: { userId, day } },
      update: { seconds: { increment: s } },
      create: { userId, day, seconds: s },
    });
  }
  await db.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  return { completed: existing?.completed || autoComplete };
}

export async function markComplete(userId: string, lessonId: string, extraSeconds = 0) {
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, watchedSeconds: { increment: extraSeconds } },
    create: { userId, lessonId, completed: true, watchedSeconds: extraSeconds },
  });
  if (extraSeconds > 0) {
    const day = dayKey();
    await db.dailyActivity.upsert({
      where: { userId_day: { userId, day } },
      update: { seconds: { increment: extraSeconds } },
      create: { userId, day, seconds: extraSeconds },
    });
  }
}

/**
 * Issues a certificate when every lesson is complete and the learner's
 * average best quiz score meets the course pass mark.
 */
export async function maybeIssueCertificate(userId: string, courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course?.certificateEnabled) return null;
  const existing = await db.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) return existing;
  const p = await courseProgress(userId, courseId);
  if (p.total === 0 || p.completed < p.total || p.quizAvg < course.passPercent) return null;
  const code = `PSA-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  await db.enrollment.updateMany({ where: { userId, courseId }, data: { completedAt: new Date() } });
  return db.certificate.create({
    data: { code, userId, courseId, scorePct: p.quizAvg, hours: Math.round((p.watchedSeconds / 3600) * 10) / 10 },
  });
}

export async function streak(userId: string) {
  const days = new Set(
    (await db.dailyActivity.findMany({ where: { userId, seconds: { gt: 0 } }, select: { day: true } })).map((d) => d.day),
  );
  let count = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not yet counted is fine
  while (days.has(dayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
