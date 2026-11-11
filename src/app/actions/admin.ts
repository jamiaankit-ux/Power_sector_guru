"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(fd.get(k) ?? 0) || 0;
const rupees = (fd: FormData, k: string) => Math.round(n(fd, k) * 100);
const lines = (fd: FormData, k: string) => JSON.stringify(s(fd, k).split("\n").map((x) => x.trim()).filter(Boolean));
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ---------- Courses ---------- */
export async function saveCourse(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id");
  const data = {
    title: s(fd, "title"), subtitle: s(fd, "subtitle"), description: s(fd, "description"), level: s(fd, "level") || "Beginner",
    language: s(fd, "language") || "English", categoryId: s(fd, "categoryId") || null, instructorName: s(fd, "instructorName"),
    instructorTitle: s(fd, "instructorTitle"), coverColor: s(fd, "coverColor") || "#1d4ed8", priceInPaise: rupees(fd, "price"),
    mrpInPaise: rupees(fd, "mrp"), accessDays: n(fd, "accessDays"), outcomes: lines(fd, "outcomes"), requirements: lines(fd, "requirements"),
    tags: s(fd, "tags").toLowerCase(), passPercent: n(fd, "passPercent") || 60, certificateEnabled: fd.get("certificateEnabled") === "on",
    published: fd.get("published") === "on", featured: fd.get("featured") === "on",
  };
  if (id) {
    await db.course.update({ where: { id }, data });
    revalidatePath(`/admin/courses/${id}`);
  } else {
    let slug = slugify(data.title) || "course";
    if (await db.course.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36);
    const c = await db.course.create({ data: { ...data, slug } });
    redirect(`/admin/courses/${c.id}`);
  }
}

export async function deleteCourse(fd: FormData) {
  await requireAdmin();
  await db.course.delete({ where: { id: s(fd, "id") } });
  redirect("/admin/courses");
}

export async function addModule(fd: FormData) {
  await requireAdmin();
  const courseId = s(fd, "courseId");
  const count = await db.module.count({ where: { courseId } });
  await db.module.create({ data: { courseId, title: s(fd, "title") || "New module", order: count } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function renameModule(fd: FormData) {
  await requireAdmin();
  const m = await db.module.update({ where: { id: s(fd, "id") }, data: { title: s(fd, "title") } });
  revalidatePath(`/admin/courses/${m.courseId}`);
}

export async function deleteModule(fd: FormData) {
  await requireAdmin();
  const m = await db.module.delete({ where: { id: s(fd, "id") } });
  revalidatePath(`/admin/courses/${m.courseId}`);
}

export async function moveModule(fd: FormData) {
  await requireAdmin();
  const m = await db.module.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  const list = await db.module.findMany({ where: { courseId: m.courseId }, orderBy: { order: "asc" } });
  const i = list.findIndex((x) => x.id === m.id), j = i + (s(fd, "dir") === "up" ? -1 : 1);
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.module.update({ where: { id: x.id }, data: { order: k } })));
  revalidatePath(`/admin/courses/${m.courseId}`);
}

/* ---------- Lessons ---------- */
export async function addLesson(fd: FormData) {
  await requireAdmin();
  const moduleId = s(fd, "moduleId");
  const type = s(fd, "type") || "VIDEO";
  const count = await db.lesson.count({ where: { moduleId } });
  const l = await db.lesson.create({ data: { moduleId, title: s(fd, "title") || "New lesson", type, order: count } });
  if (type === "QUIZ") await db.quiz.create({ data: { lessonId: l.id } });
  redirect(`/admin/lessons/${l.id}`);
}

export async function saveLesson(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id");
  const l = await db.lesson.update({
    where: { id },
    data: {
      title: s(fd, "title"), videoUrl: s(fd, "videoUrl") || null, content: s(fd, "content"), resourceUrl: s(fd, "resourceUrl") || null,
      resourceName: s(fd, "resourceName") || null, durationSec: Math.round(n(fd, "durationMin") * 60), isPreview: fd.get("isPreview") === "on",
    },
    include: { module: true },
  });
  if (l.type === "QUIZ") {
    await db.quiz.upsert({
      where: { lessonId: id },
      update: { passPercent: n(fd, "passPercent") || 60, timeLimitSec: Math.round(n(fd, "timeLimitMin") * 60), maxAttempts: n(fd, "maxAttempts") },
      create: { lessonId: id, passPercent: n(fd, "passPercent") || 60, timeLimitSec: Math.round(n(fd, "timeLimitMin") * 60), maxAttempts: n(fd, "maxAttempts") },
    });
  }
  revalidatePath(`/admin/lessons/${id}`);
  redirect(`/admin/courses/${l.module.courseId}`);
}

export async function deleteLesson(fd: FormData) {
  await requireAdmin();
  const l = await db.lesson.delete({ where: { id: s(fd, "id") }, include: { module: true } });
  revalidatePath(`/admin/courses/${l.module.courseId}`);
}

export async function moveLesson(fd: FormData) {
  await requireAdmin();
  const l = await db.lesson.findUniqueOrThrow({ where: { id: s(fd, "id") }, include: { module: true } });
  const list = await db.lesson.findMany({ where: { moduleId: l.moduleId }, orderBy: { order: "asc" } });
  const i = list.findIndex((x) => x.id === l.id), j = i + (s(fd, "dir") === "up" ? -1 : 1);
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.lesson.update({ where: { id: x.id }, data: { order: k } })));
  revalidatePath(`/admin/courses/${l.module.courseId}`);
}

export async function addQuestion(fd: FormData) {
  await requireAdmin();
  const quizId = s(fd, "quizId");
  const options = [0, 1, 2, 3].map((i) => s(fd, `opt${i}`)).filter(Boolean);
  if (options.length < 2) return;
  const count = await db.question.count({ where: { quizId } });
  await db.question.create({ data: { quizId, text: s(fd, "text"), options: JSON.stringify(options), correctIndex: Math.min(n(fd, "correct"), options.length - 1), explanation: s(fd, "explanation"), order: count } });
  revalidatePath(`/admin/lessons/${s(fd, "lessonId")}`);
}

export async function deleteQuestion(fd: FormData) {
  await requireAdmin();
  await db.question.delete({ where: { id: s(fd, "id") } });
  revalidatePath(`/admin/lessons/${s(fd, "lessonId")}`);
}

/* ---------- Coupons ---------- */
export async function saveCoupon(fd: FormData) {
  await requireAdmin();
  const kind = s(fd, "kind") === "FLAT" ? "FLAT" : "PERCENT";
  const target = s(fd, "target"); // "TYPE:id" or "TYPE" or ""
  const [appliesTo, targetId] = target ? target.split(":") : ["ALL", ""];
  const code = s(fd, "code").toUpperCase().replace(/\s+/g, "");
  if (!code || (await db.coupon.findUnique({ where: { code } }))) redirect(`/admin/coupons?error=${encodeURIComponent(code)}`);
  await db.coupon.create({
    data: {
      code, description: s(fd, "description"), kind,
      value: kind === "FLAT" ? rupees(fd, "value") : Math.min(100, n(fd, "value")), maxDiscount: rupees(fd, "maxDiscount"),
      minOrder: rupees(fd, "minOrder"), appliesTo: appliesTo || "ALL", targetId: targetId || null, maxRedemptions: n(fd, "maxRedemptions"),
      perUserLimit: n(fd, "perUserLimit"), validFrom: s(fd, "validFrom") ? new Date(s(fd, "validFrom")) : null,
      validTo: s(fd, "validTo") ? new Date(s(fd, "validTo") + "T23:59:59") : null,
    },
  });
  redirect("/admin/coupons");
}

export async function toggleCoupon(fd: FormData) {
  await requireAdmin();
  const c = await db.coupon.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath("/admin/coupons");
}

/* ---------- Plans and bundles ---------- */
export async function savePlan(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id");
  const data = { name: s(fd, "name"), description: s(fd, "description"), interval: s(fd, "interval") || "YEAR", priceInPaise: rupees(fd, "price"), features: lines(fd, "features"), highlight: fd.get("highlight") === "on", active: fd.get("active") === "on" };
  if (id) await db.plan.update({ where: { id }, data }); else await db.plan.create({ data });
  revalidatePath("/admin/pricing");
}

export async function saveBundle(fd: FormData) {
  await requireAdmin();
  const id = s(fd, "id");
  const courseIds = fd.getAll("courseIds").map(String);
  const data = { title: s(fd, "title"), description: s(fd, "description"), priceInPaise: rupees(fd, "price"), mrpInPaise: rupees(fd, "mrp"), accessDays: n(fd, "accessDays"), published: fd.get("published") === "on" };
  if (id) {
    await db.bundle.update({ where: { id }, data });
    await db.bundleCourse.deleteMany({ where: { bundleId: id } });
    await db.bundleCourse.createMany({ data: courseIds.map((courseId) => ({ bundleId: id, courseId })) });
  } else {
    await db.bundle.create({ data: { ...data, slug: slugify(data.title) + "-" + Date.now().toString(36), courses: { create: courseIds.map((courseId) => ({ courseId })) } } });
  }
  revalidatePath("/admin/pricing");
}

/* ---------- Users ---------- */
export async function setRole(fd: FormData) {
  const me = await requireAdmin();
  if (me.role !== "ADMIN") return;
  await db.user.update({ where: { id: s(fd, "id") }, data: { role: s(fd, "role") } });
  revalidatePath("/admin/users");
}

export async function grantAccess(fd: FormData) {
  await requireAdmin();
  const userId = s(fd, "userId"), courseId = s(fd, "courseId");
  if (!courseId) return;
  await db.enrollment.upsert({ where: { userId_courseId: { userId, courseId } }, update: { source: "ADMIN", expiresAt: null }, create: { userId, courseId, source: "ADMIN" } });
  revalidatePath("/admin/users");
}

export async function postAnnouncement(fd: FormData) {
  await requireAdmin();
  await db.announcement.create({ data: { title: s(fd, "title"), body: s(fd, "body") } });
  revalidatePath("/admin/announcements");
}

export async function replyAsInstructor(fd: FormData) {
  const u = await requireAdmin();
  await db.comment.create({ data: { userId: u.id, lessonId: s(fd, "lessonId"), parentId: s(fd, "parentId"), body: s(fd, "body") } });
  revalidatePath("/admin/discussions");
}
