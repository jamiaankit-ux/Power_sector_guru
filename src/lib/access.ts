import "server-only";
import { db } from "./db";

export async function activeSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
    include: { plan: true },
    orderBy: { currentPeriodEnd: "desc" },
  });
}

/** Whether the user may open paid lessons of this course. */
export async function canAccessCourse(
  user: { id: string; role: string } | null,
  course: { id: string; priceInPaise: number },
) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "INSTRUCTOR") return true;
  const e = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
  if (e && (!e.expiresAt || e.expiresAt > new Date())) return true;
  const sub = await activeSubscription(user.id);
  if (sub?.plan.allCourses) return true;
  return false;
}

/** Makes sure an enrollment row exists (for free courses or subscribers starting a course). */
export async function ensureEnrollment(userId: string, courseId: string, source: string, accessDays = 0) {
  const expiresAt = accessDays > 0 ? new Date(Date.now() + accessDays * 86400_000) : null;
  return db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: source === "SUBSCRIPTION" || source === "FREE" ? {} : { source, expiresAt },
    create: { userId, courseId, source, expiresAt },
  });
}
