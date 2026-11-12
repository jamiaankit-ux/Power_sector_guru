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
const randomCode = (prefix: string, len = 6) => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike letters
  let out = "";
  for (let i = 0; i < len; i++) out += abc[Math.floor(Math.random() * abc.length)];
  return (prefix ? prefix + "-" : "") + out;
};

/** Creates one code, edits one, or bulk-generates many unique single-use codes. */
export async function saveCoupon(fd: FormData) {
  const me = await requireOwner();
  const id = s(fd, "id");
  const kind = s(fd, "kind") === "FLAT" ? "FLAT" : "PERCENT";
  const target = s(fd, "target"); // "TYPE:id" or "TYPE" or ""
  const [appliesTo, targetId] = target ? target.split(":") : ["ALL", ""];
  const clean = (c: string) => c.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const data = {
    description: s(fd, "description"), kind,
    value: kind === "FLAT" ? rupees(fd, "value") : Math.max(1, Math.min(100, n(fd, "value"))), maxDiscount: rupees(fd, "maxDiscount"),
    minOrder: rupees(fd, "minOrder"), appliesTo: appliesTo || "ALL", targetId: targetId || null, maxRedemptions: n(fd, "maxRedemptions"),
    perUserLimit: n(fd, "perUserLimit"), validFrom: s(fd, "validFrom") ? new Date(s(fd, "validFrom")) : null,
    validTo: s(fd, "validTo") ? new Date(s(fd, "validTo") + "T23:59:59") : null,
  };
  if (id) {
    const c = await db.coupon.update({ where: { id }, data });
    await audit(me, "coupon.update", c.code);
    redirect("/admin/coupons?saved=1");
  }
  const count = Math.min(500, Math.max(1, n(fd, "count") || 1));
  if (count > 1) {
    const prefix = clean(s(fd, "code")).slice(0, 12);
    const codes = new Set<string>();
    while (codes.size < count) codes.add(randomCode(prefix, 7));
    const taken = new Set((await db.coupon.findMany({ where: { code: { in: [...codes] } }, select: { code: true } })).map((c) => c.code));
    const fresh = [...codes].filter((c) => !taken.has(c));
    const batch = `${data.description || "Bulk codes"} · batch ${new Date().toISOString().slice(0, 10)}`;
    await db.coupon.createMany({ data: fresh.map((code) => ({ ...data, code, description: batch, maxRedemptions: 1, perUserLimit: 1 })) });
    await audit(me, "coupon.bulk", `${fresh.length} codes · ${batch}`);
    redirect(`/admin/coupons?made=${fresh.length}&q=${encodeURIComponent(batch)}`);
  }
  let code = clean(s(fd, "code"));
  if (!code) do { code = randomCode("", 8); } while (await db.coupon.findUnique({ where: { code } }));
  else if (await db.coupon.findUnique({ where: { code } })) redirect(`/admin/coupons?error=${encodeURIComponent(code)}`);
  await db.coupon.create({ data: { ...data, code } });
  await audit(me, "coupon.create", code);
  redirect(`/admin/coupons?saved=1&q=${code}`);
}

export async function deleteCoupon(fd: FormData) {
  const me = await requireOwner();
  const c = await db.coupon.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  // Used codes stay on record for the orders that used them; they are switched off instead.
  if (c.redeemed > 0) await db.coupon.update({ where: { id: c.id }, data: { active: false } });
  else await db.coupon.delete({ where: { id: c.id } });
  await audit(me, c.redeemed > 0 ? "coupon.disable" : "coupon.delete", c.code);
  revalidatePath("/admin/coupons");
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
  // On/off switches: an unticked checkbox is not submitted, so the form lists them in __bools.
  for (const k of fd.getAll("__bools").map(String)) if (k in DEFAULT_SETTINGS) values[k] = fd.get(k) === "on" ? "true" : "false";
  await saveSettings(values);
  await audit(me, "website.save", Object.keys(values).join(", "));
  revalidatePath("/", "layout");
  const back = s(fd, "__back");
  redirect(`${back.startsWith("/admin") ? back : "/admin/settings"}?saved=1`);
}

/* ---------- Integrations (payments, SMS, AI, storage, video, push) ---------- */
export async function saveIntegrations(fd: FormData) {
  const me = await requireOwner();
  const { CONFIG_FIELDS, saveConfig } = await import("@/lib/config");
  const values: Record<string, string> = {};
  for (const k of Object.keys(CONFIG_FIELDS)) if (fd.has(k)) values[k] = s(fd, k);
  for (const k of fd.getAll("__bools").map(String)) if (k in CONFIG_FIELDS) values[k] = fd.get(k) === "on" ? "true" : "false";
  const clear = fd.getAll("__clear").map(String);
  await saveConfig(values, clear);
  // Never log secret values, only which settings changed.
  await audit(me, "integrations.save", [...Object.keys(values).filter((k) => values[k]), ...clear.map((k) => `cleared ${k}`)].join(", "));
  revalidatePath("/", "layout");
  redirect(`/admin/integrations?saved=1${s(fd, "__tab") ? `&tab=${s(fd, "__tab")}` : ""}`);
}

/* ---------- Website pages ---------- */
const RESERVED = ["admin", "api", "courses", "learn", "dashboard", "login", "register", "pricing", "checkout", "certificates", "verify", "leaderboard", "profile", "privacy", "terms", "refunds", "install", "offline", "invoice", "forgot-password", "downloads", "icons", "sw.js"];
export async function savePage(fd: FormData) {
  const me = await requireOwner();
  const id = s(fd, "id");
  const title = s(fd, "title") || "Untitled page";
  let slug = slugify(s(fd, "slug") || title) || "page";
  if (RESERVED.includes(slug)) slug += "-page";
  const clash = await db.page.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug += "-" + Date.now().toString(36).slice(-4);
  const data = { title, slug, summary: s(fd, "summary"), body: String(fd.get("body") ?? ""), published: fd.get("published") === "on", showInNav: fd.get("showInNav") === "on", showInFooter: fd.get("showInFooter") === "on", order: n(fd, "order") };
  const page = id ? await db.page.update({ where: { id }, data }) : await db.page.create({ data });
  await audit(me, id ? "page.update" : "page.create", `${title} (/${slug})`);
  revalidatePath("/", "layout");
  redirect(`/admin/site/pages/${page.id}?saved=1`);
}

export async function deletePage(fd: FormData) {
  const me = await requireOwner();
  const p = await db.page.delete({ where: { id: s(fd, "id") } });
  await audit(me, "page.delete", p.title);
  revalidatePath("/", "layout");
  redirect("/admin/site/pages");
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

/* ---------- Orders: offline sales, manual confirmation, refunds ---------- */
export async function createManualOrder(fd: FormData) {
  const me = await requireOwner();
  const who = s(fd, "learner").toLowerCase();
  const { normalizePhone } = await import("@/lib/auth");
  const user = await db.user.findFirst({ where: who.includes("@") ? { email: who } : { phone: normalizePhone(who) } });
  if (!user) redirect("/admin/orders?error=" + encodeURIComponent("No learner found with that email or mobile number. Ask them to register first."));
  const [type, itemId] = s(fd, "item").split(":");
  const { loadItem, fulfillOrder } = await import("@/lib/pricing");
  const item = type && itemId ? await loadItem(type as "COURSE" | "BUNDLE" | "PLAN", itemId) : null;
  if (!item) redirect("/admin/orders?error=" + encodeURIComponent("Choose what the learner bought."));
  const total = fd.get("amount") === "" ? item!.price : rupees(fd, "amount");
  const { getConfig } = await import("@/lib/config");
  const rate = Number((await getConfig()).taxPercent || 0) / 100;
  const order = await db.order.create({
    data: { userId: user!.id, itemType: type, itemId, itemTitle: item!.title, amount: item!.price, discount: Math.max(0, item!.price - total), tax: Math.round(total - total / (1 + rate)), total, provider: "offline", note: s(fd, "note") || null },
  });
  await fulfillOrder(order.id, s(fd, "reference") || `offline_${Date.now()}`);
  await audit(me, "order.manual", `${user!.name} · ${item!.title} · ₹${total / 100}`);
  redirect("/admin/orders?ok=" + encodeURIComponent(`Order recorded and access given to ${user!.name}.`));
}

export async function markOrderPaid(fd: FormData) {
  const me = await requireOwner();
  const { fulfillOrder } = await import("@/lib/pricing");
  const o = await db.order.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  if (o.status === "PAID" || o.status === "REFUNDED") return;
  await fulfillOrder(o.id, o.providerRef ?? `manual_${Date.now()}`);
  await db.order.update({ where: { id: o.id }, data: { note: "Confirmed manually by admin" } });
  await audit(me, "order.mark_paid", `${o.itemTitle} · ${o.id}`);
  revalidatePath("/admin/orders");
}

export async function refundOrder(fd: FormData) {
  const me = await requireOwner();
  const o = await db.order.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  if (o.status !== "PAID") return;
  const { refundPayment } = await import("@/lib/payments");
  let ref: string | null = null;
  try {
    ref = await refundPayment(o);
  } catch (e) {
    redirect("/admin/orders?error=" + encodeURIComponent((e as Error).message));
  }
  await db.order.update({ where: { id: o.id }, data: { status: "REFUNDED", refundedAt: new Date(), note: [s(fd, "reason"), ref ? `refund ${ref}` : "refund recorded; return the money yourself"].filter(Boolean).join(" · ") } });
  // Take back what the order unlocked.
  if (o.itemType === "COURSE") await db.enrollment.deleteMany({ where: { userId: o.userId, courseId: o.itemId, source: "PURCHASE" } });
  else if (o.itemType === "BUNDLE") {
    const ids = (await db.bundleCourse.findMany({ where: { bundleId: o.itemId } })).map((b) => b.courseId);
    await db.enrollment.deleteMany({ where: { userId: o.userId, courseId: { in: ids }, source: "BUNDLE" } });
  } else await db.subscription.updateMany({ where: { userId: o.userId, planId: o.itemId, currentPeriodEnd: { gt: new Date() } }, data: { currentPeriodEnd: new Date() } });
  await audit(me, "order.refund", `${o.itemTitle} · ₹${o.total / 100} · ${ref ?? "manual"}`);
  redirect("/admin/orders?ok=" + encodeURIComponent(ref ? "Refund sent through Razorpay and access removed." : "Order marked refunded and access removed. Remember to return the money yourself."));
}

/* ---------- Media library ---------- */
export async function deleteMedia(fd: FormData) {
  const me = await requireAdmin();
  const m = await db.media.findUniqueOrThrow({ where: { id: s(fd, "id") } });
  if (m.store === "database" && m.ref) await db.storedFile.deleteMany({ where: { id: m.ref } });
  else { const { deleteRemote } = await import("@/lib/video"); await deleteRemote(m.store, m.ref); }
  await db.media.delete({ where: { id: m.id } });
  await audit(me, "media.delete", m.name);
  revalidatePath("/admin/media");
}
