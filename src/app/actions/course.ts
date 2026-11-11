"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { activeSubscription, ensureEnrollment } from "@/lib/access";

export async function enroll(fd: FormData) {
  const courseId = String(fd.get("courseId"));
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId }, include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" }, take: 1 } } } } });
  const user = await requireUser(`/courses/${course.slug}`);
  if (course.priceInPaise === 0) await ensureEnrollment(user.id, course.id, "FREE", 0);
  else {
    const sub = await activeSubscription(user.id);
    if (!sub?.plan.allCourses && user.role === "STUDENT") redirect(`/checkout?type=COURSE&id=${course.id}`);
    await ensureEnrollment(user.id, course.id, "SUBSCRIPTION", 0);
  }
  const first = course.modules.find((m) => m.lessons.length)?.lessons[0];
  redirect(first ? `/learn/${course.slug}/${first.id}` : `/courses/${course.slug}`);
}

export async function submitReview(fd: FormData) {
  const user = await requireUser();
  const courseId = String(fd.get("courseId"));
  const rating = Math.min(5, Math.max(1, Number(fd.get("rating")) || 5));
  const comment = String(fd.get("comment") || "").slice(0, 2000);
  const enrolled = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!enrolled) return;
  await db.review.upsert({ where: { userId_courseId: { userId: user.id, courseId } }, update: { rating, comment }, create: { userId: user.id, courseId, rating, comment } });
  const c = await db.course.findUnique({ where: { id: courseId } });
  revalidatePath(`/courses/${c?.slug}`);
}
