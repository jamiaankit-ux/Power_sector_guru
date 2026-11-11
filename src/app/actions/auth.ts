"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, isEmail, normalizePhone, startSession } from "@/lib/auth";
import { sendOtp, verifyOtp } from "@/lib/otp";

export type FormState = { error?: string; ok?: string; step?: "otp"; devCode?: string; identifier?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
};

function parseIdentifier(raw: string) {
  const v = raw.trim();
  if (isEmail(v)) return { kind: "email" as const, value: v.toLowerCase() };
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 13) return { kind: "phone" as const, value: normalizePhone(v) };
  return null;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organization: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, password, organization, designation } = parsed.data;
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  const phoneRaw = parsed.data.phone?.replace(/\D/g, "") ?? "";
  if (!email && !phoneRaw) return { error: "Add an email address or a mobile number" };
  if (phoneRaw && (phoneRaw.length < 10 || phoneRaw.length > 13)) return { error: "Enter a valid mobile number" };
  const phone = phoneRaw ? normalizePhone(parsed.data.phone!) : null;
  if (email && (await db.user.findUnique({ where: { email } }))) return { error: "An account with this email already exists. Please sign in." };
  if (phone && (await db.user.findUnique({ where: { phone } }))) return { error: "An account with this mobile number already exists. Please sign in." };
  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 10), organization: organization || null, designation: designation || null },
  });
  await startSession(user);
  redirect(safeNext(fd.get("next")) === "/dashboard" ? "/dashboard?welcome=1" : safeNext(fd.get("next")));
}

export async function loginWithPassword(_: FormState, fd: FormData): Promise<FormState> {
  const id = parseIdentifier(String(fd.get("identifier") || ""));
  const password = String(fd.get("password") || "");
  if (!id) return { error: "Enter your email address or 10 digit mobile number" };
  const user = await db.user.findUnique({ where: id.kind === "email" ? { email: id.value } : { phone: id.value } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
    return { error: "Incorrect login details. Try again or sign in with a one-time code." };
  await startSession(user);
  redirect(safeNext(fd.get("next")));
}

export async function requestOtp(_: FormState, fd: FormData): Promise<FormState> {
  const id = parseIdentifier(String(fd.get("identifier") || ""));
  if (!id) return { error: "Enter your email address or 10 digit mobile number" };
  const user = await db.user.findUnique({ where: id.kind === "email" ? { email: id.value } : { phone: id.value } });
  if (!user) return { error: "No account found. Please register first." };
  try {
    const { devCode } = await sendOtp(id.value, id.kind === "email" ? "email" : "sms");
    return { step: "otp", identifier: id.value, devCode, ok: `We sent a 6 digit code to ${id.value}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function confirmOtp(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = String(fd.get("identifier") || "");
  const code = String(fd.get("code") || "");
  if (!(await verifyOtp(identifier, code))) return { step: "otp", identifier, error: "That code is incorrect or expired." };
  const user = await db.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
  if (!user) return { error: "Account not found" };
  await startSession(user);
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const { currentUser } = await import("@/lib/auth");
  const u = await currentUser();
  if (!u) return { error: "Please sign in" };
  const name = String(fd.get("name") || "").trim();
  if (name.length < 2) return { error: "Name is too short" };
  const data: Record<string, string | null> = {
    name,
    organization: String(fd.get("organization") || "") || null,
    designation: String(fd.get("designation") || "") || null,
    city: String(fd.get("city") || "") || null,
  };
  const pw = String(fd.get("password") || "");
  if (pw) {
    if (pw.length < 8) return { error: "Password must be at least 8 characters" };
    data.passwordHash = await bcrypt.hash(pw, 10);
  }
  await db.user.update({ where: { id: u.id }, data });
  return { ok: "Profile saved" };
}
