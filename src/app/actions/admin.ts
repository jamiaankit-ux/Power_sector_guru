"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";

/** Full admins only. */
async function requireOwner() {
  const me = await requireAdmin();
  if (me.role !== "ADMIN") throw new Error("Only admins can do this.");
  return me;
}
/** Admins can edit any course; instructors only the courses they own. */
async function guardCourse(courseId: string) {
  const me = await requireAdmin();
  if (me.role === "ADMIN") return me;
  const c = await db.course.findUnique({ where: { id: courseId }, select: { ownerId: true } });
  if (!c || c.ownerId !== me.id) throw new Error("You can only edit your own courses.");
  return me;
}
const courseOfModule = async (id: string) => (await db.module.findUniqueOrThrow({ where: { id }, select: { courseId: true } })).courseId;
const courseOfLesson = async (id: string) => (await db.lesson.findUniqueOrThrow({ where: { id }, include: { module: { select: { courseId: true } } } })).module.courseId;
const courseOfQuiz = async (id: string) => courseOfLesson((await db.quiz.findUniqueOrThrow({ where: { id }, select: { lessonId: true } })).lessonId);

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(fd.get(k) ?? 0) || 0;
const rupees = (fd: FormData, k: string) => Math.round(n(fd, k) * 100);
const lines = (fd: FormData, k: string) => JSON.stringify(s(fd, k).split("\n").map((x) => x.trim()).filter(Boolean));
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ---------- Courses ---------- */
export async function saveCourse(fd: FormData) {
  const id = s(fd, "id");
  const me = id ? await guardCourse(id) : await requireAdmin();
  const data = {
    title: s(fd, "title"), subtitle: s(fd, "subtitle"), description: s(fd, "description"), level: s(fd, "level") || "Beginner",
    language: s(fd, "language") || "English", categoryId: s(fd, "categoryId") || null, instructorName: s(fd, "instructorName"),
    instructorTitle: s(fd, "instructorTitle"), coverColor: s(fd, "coverColor") || "#1d4ed8", priceInPaise: rupees(fd, "price"),
    mrpInPaise: rupees(fd, "mrp"), accessDays: n(fd, "accessDays"), outcomes: lines(fd, "outcomes"), requirements: lines(fd, "requirements"),
    tags: s(fd, "tags").toLowerCase(), coverImage: s(fd, "coverImage") || null, passPercent: n(fd, "passPercent") || 60, certificateEnabled: fd.get("certificateEnabled") === "on",
    published: fd.get("published") === "on", featured: fd.get("featured") === "on",
  };
  if (id) {
    await db.course.update({ where: { id }, data });
    await audit(me, "course.update", data.title);
    revalidatePath(`/admin/courses/${id}`);
  } else {
    let slug = slugify(data.title) || "course";
    if (await db.course.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36);
    const c = await db.course.create({ data: { ...data, slug, ownerId: me.id } });
    await audit(me, "course.create", data.title);
    redirect(`/admin/courses/${c.id}`);
  }
}

export async function deleteCourse(fd: FormData) {
  const me = await guardCourse(s(fd, "id"));
  const c = await db.course.delete({ where: { id: s(fd, "id") } });
  await audit(me, "course.delete", c.title);
  redirect("/admin/courses");
}

export async function addModule(fd: FormData) {
  const courseId = s(fd, "courseId");
  await guardCourse(courseId);
  const count = await db.module.count({ where: { courseId } });
  await db.module.create({ data: { courseId, title: s(fd, "title") || "New module", order: count } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function renameModule(fd: FormData) {
  await guardCourse(await courseOfModule(s(fd, "id")));
  const m = await db.module.update({ where: { id: s(fd, "id") }, data: { title: s(fd, "title") } });
  revalidatePath(`/admin/courses/${m.courseId}`);
}

export async function deleteModule(fd: FormData) {
  await guardCourse(await courseOfModule(s(fd, "id")));
  const m = await db.module.delete({ where: { id: s(fd, "id") } });
  revalidatePath(`/admin/courses/${m.courseId}`);
}

export async function moveModule(fd: FormData) {
  await guardCourse(await courseOfModule(s(fd, "id")));
  const m = await db.module.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  const list = await db.module.findMany({ where: { courseId: m.courseId }, orderBy: { order: "asc" } });
  const i = list.findIndex((x) => x.id === m.id), j = i + (s(fd, "dir") === "up" ? -1 : 1);
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.module.update({ where: { id: x.id }, data: { order: k } })));
  revalidatePath(`/admin/courses/${m.courseId}`);
}

/* ---------- Lessons ---------- */
export async function addLesson(fd: FormData) {
  const moduleId = s(fd, "moduleId");
  await guardCourse(await courseOfModule(moduleId));
  const type = s(fd, "type") || "VIDEO";
  const count = await db.lesson.count({ where: { moduleId } });
  const l = await db.lesson.create({ data: { moduleId, title: s(fd, "title") || "New lesson", type, order: count } });
  if (type === "QUIZ") await db.quiz.create({ data: { lessonId: l.id } });
  redirect(`/admin/lessons/${l.id}`);
}

export async function saveLesson(fd: FormData) {
  await guardCourse(await courseOfLesson(s(fd, "id")));
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
  await guardCourse(await courseOfLesson(s(fd, "id")));
  const l = await db.lesson.delete({ where: { id: s(fd, "id") }, include: { module: true } });
  revalidatePath(`/admin/courses/${l.module.courseId}`);
}

export async function moveLesson(fd: FormData) {
  await guardCourse(await courseOfLesson(s(fd, "id")));
  const l = await db.lesson.findUniqueOrThrow({ where: { id: s(fd, "id") }, include: { module: true } });
  const list = await db.lesson.findMany({ where: { moduleId: l.moduleId }, orderBy: { order: "asc" } });
  const i = list.findIndex((x) => x.id === l.id), j = i + (s(fd, "dir") === "up" ? -1 : 1);
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.lesson.update({ where: { id: x.id }, data: { order: k } })));
  revalidatePath(`/admin/courses/${l.module.courseId}`);
}

export async function addQuestion(fd: FormData) {
  const quizId = s(fd, "quizId");
  await guardCourse(await courseOfQuiz(quizId));
  const options = [0, 1, 2, 3].map((i) => s(fd, `opt${i}`)).filter(Boolean);
  if (options.length < 2) return;
  const count = await db.question.count({ where: { quizId } });
  await db.question.create({ data: { quizId, text: s(fd, "text"), options: JSON.stringify(options), correctIndex: Math.min(n(fd, "correct"), options.length - 1), explanation: s(fd, "explanation"), order: count } });
  revalidatePath(`/admin/lessons/${s(fd, "lessonId")}`);
}

export async function deleteQuestion(fd: FormData) {
  const q = await db.question.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  await guardCourse(await courseOfQuiz(q.quizId));
  await db.question.delete({ where: { id: s(fd, "id") } });
  revalidatePath(`/admin/lessons/${s(fd, "lessonId")}`);
}

/* ---------- Coupons ---------- */
export async function saveCoupon(fd: FormData) {
  const me = await requireOwner();
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
  await audit(me, "coupon.create", code);
  redirect("/admin/coupons");
}

export async function toggleCoupon(fd: FormData) {
  const me = await requireOwner();
  const c = await db.coupon.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  await audit(me, c.active ? "coupon.disable" : "coupon.enable", c.code);
  revalidatePath("/admin/coupons");
}

/* ---------- Plans and bundles ---------- */
export async function savePlan(fd: FormData) {
  const me = await requireOwner();
  const id = s(fd, "id");
  const data = { name: s(fd, "name"), description: s(fd, "description"), interval: s(fd, "interval") || "YEAR", priceInPaise: rupees(fd, "price"), features: lines(fd, "features"), highlight: fd.get("highlight") === "on", active: fd.get("active") === "on" };
  if (id) await db.plan.update({ where: { id }, data }); else await db.plan.create({ data });
  await audit(me, "plan.save", data.name);
  revalidatePath("/admin/pricing");
}

export async function saveBundle(fd: FormData) {
  const me = await requireOwner();
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
  await audit(me, "bundle.save", data.title);
  revalidatePath("/admin/pricing");
}

/* ---------- Users ---------- */
export async function setRole(fd: FormData) {
  const me = await requireOwner();
  const role = ["STUDENT", "INSTRUCTOR", "ADMIN"].includes(s(fd, "role")) ? s(fd, "role") : "STUDENT";
  if (s(fd, "id") === me.id && role !== "ADMIN") return; // don't lock yourself out
  const u = await db.user.update({ where: { id: s(fd, "id") }, data: { role } });
  await audit(me, "user.role", `${u.name} → ${role}`);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${u.id}`);
}

export async function grantAccess(fd: FormData) {
  const me = await requireOwner();
  const userId = s(fd, "userId"), courseId = s(fd, "courseId");
  if (!courseId) return;
  await db.enrollment.upsert({ where: { userId_courseId: { userId, courseId } }, update: { source: "ADMIN", expiresAt: null }, create: { userId, courseId, source: "ADMIN" } });
  await audit(me, "access.grant", `user ${userId} course ${courseId}`);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function postAnnouncement(fd: FormData) {
  const me = await requireOwner();
  await db.announcement.create({ data: { title: s(fd, "title"), body: s(fd, "body") } });
  await audit(me, "announcement.post", s(fd, "title"));
  revalidatePath("/admin/announcements");
}

export async function replyAsInstructor(fd: FormData) {
  const u = await requireAdmin();
  await db.comment.create({ data: { userId: u.id, lessonId: s(fd, "lessonId"), parentId: s(fd, "parentId"), body: s(fd, "body") } });
  revalidatePath("/admin/discussions");
}

/* ---------- Learner management ---------- */
export async function revokeAccess(fd: FormData) {
  const me = await requireOwner();
  const e = await db.enrollment.delete({ where: { id: s(fd, "id") }, include: { course: { select: { title: true } }, user: { select: { name: true, id: true } } } });
  await audit(me, "access.revoke", `${e.user.name} · ${e.course.title}`);
  revalidatePath(`/admin/users/${e.user.id}`);
}

export async function adminResetPassword(fd: FormData) {
  const me = await requireOwner();
  const id = s(fd, "id");
  const { randomBytes } = await import("crypto");
  const bcrypt = (await import("bcryptjs")).default;
  const temp = "PSA-" + randomBytes(4).toString("hex");
  const u = await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(temp, 10) } });
  await audit(me, "user.password_reset", u.name);
  redirect(`/admin/users/${id}?temp=${encodeURIComponent(temp)}`);
}

/* ---------- Course tools ---------- */
export async function duplicateCourse(fd: FormData) {
  const me = await guardCourse(s(fd, "id"));
  const c = await db.course.findUniqueOrThrow({
    where: { id: s(fd, "id") },
    include: { modules: { include: { lessons: { include: { quiz: { include: { questions: true } } } } } } },
  });
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, modules, ...rest } = c;
  void _id; void _slug; void _c; void _u;
  const copy = await db.course.create({ data: { ...rest, title: `${c.title} (copy)`, slug: `${c.slug}-copy-${Date.now().toString(36)}`, published: false, featured: false, ownerId: me.role === "ADMIN" ? c.ownerId : me.id } });
  for (const m of modules) {
    const nm = await db.module.create({ data: { courseId: copy.id, title: m.title, order: m.order } });
    for (const l of m.lessons) {
      const { id: _lid, moduleId: _mid, quiz, ...lr } = l;
      void _lid; void _mid;
      const nl = await db.lesson.create({ data: { ...lr, moduleId: nm.id } });
      if (quiz) {
        const { id: _qid, lessonId: _ql, questions, ...qr } = quiz;
        void _qid; void _ql;
        await db.quiz.create({ data: { ...qr, lessonId: nl.id, questions: { create: questions.map(({ id: _x, quizId: _y, ...q }) => { void _x; void _y; return q; }) } } });
      }
    }
  }
  await audit(me, "course.duplicate", c.title);
  redirect(`/admin/courses/${copy.id}`);
}

export async function setCourseOwner(fd: FormData) {
  const me = await requireOwner();
  const c = await db.course.update({ where: { id: s(fd, "id") }, data: { ownerId: s(fd, "ownerId") || null } });
  await audit(me, "course.owner", `${c.title} → ${s(fd, "ownerId") || "none"}`);
  revalidatePath(`/admin/courses/${c.id}`);
}

/** Bulk-adds quiz questions from CSV: question, option A, option B, option C, option D, correct letter, explanation */
export async function importQuestions(fd: FormData) {
  const quizId = s(fd, "quizId");
  const me = await guardCourse(await courseOfQuiz(quizId));
  const file = fd.get("file");
  const text = file instanceof File && file.size ? await file.text() : s(fd, "csv");
  const rows = parseCsv(text);
  if (rows[0] && /question/i.test(rows[0][0] ?? "")) rows.shift();
  let order = await db.question.count({ where: { quizId } });
  let added = 0;
  for (const r of rows) {
    const [text, a, b, c, d, correct, explanation] = r.map((x) => (x ?? "").trim());
    const options = [a, b, c, d].filter(Boolean);
    if (!text || options.length < 2) continue;
    const letter = "ABCD".indexOf((correct || "A").toUpperCase()[0]);
    const idx = Math.max(0, Math.min(options.length - 1, letter >= 0 ? letter : (Number(correct) || 1) - 1));
    await db.question.create({ data: { quizId, text, options: JSON.stringify(options), correctIndex: idx, explanation: explanation || "", order: order++ } });
    added++;
  }
  await audit(me, "quiz.import", `${added} questions`);
  revalidatePath(`/admin/lessons/${s(fd, "lessonId")}`);
  redirect(`/admin/lessons/${s(fd, "lessonId")}?imported=${added}`);
}

/* ---------- Certificates ---------- */
export async function toggleCertificate(fd: FormData) {
  const me = await requireOwner();
  const c = await db.certificate.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  await db.certificate.update({ where: { id: c.id }, data: { revoked: !c.revoked } });
  await audit(me, c.revoked ? "certificate.restore" : "certificate.revoke", c.code);
  revalidatePath("/admin/certificates");
}

/* ---------- Settings ---------- */
export async function saveSiteSettings(fd: FormData) {
  const me = await requireOwner();
  const { DEFAULT_SETTINGS, saveSettings } = await import("@/lib/settings");
  const values: Record<string, string> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (fd.has(k)) values[k] = s(fd, k);
  await saveSettings(values);
  await audit(me, "settings.save", Object.keys(values).join(", "));
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

/* ---------- Push notifications ---------- */
export async function sendNotification(fd: FormData) {
  const me = await requireOwner();
  const { sendPush } = await import("@/lib/push");
  const title = s(fd, "title"), body = s(fd, "body");
  const url = s(fd, "url").startsWith("/") ? s(fd, "url") : "/dashboard";
  if (!title || !body) redirect("/admin/notifications?error=" + encodeURIComponent("Add a title and message"));
  let result = "";
  try {
    const r = await sendPush(title, body, url);
    result = `Sent to ${r.sent} of ${r.total} devices`;
  } catch (e) {
    redirect("/admin/notifications?error=" + encodeURIComponent((e as Error).message));
  }
  if (fd.get("announce") === "on") await db.announcement.create({ data: { title, body } });
  await audit(me, "push.send", `${title} · ${result}`);
  redirect("/admin/notifications?ok=" + encodeURIComponent(result));
}
