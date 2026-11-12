import "server-only";
import { createHash, randomInt } from "crypto";
import { db } from "./db";
import { getConfig } from "./config";

/** OTP login needs a real SMS or email provider on a live site (in development codes are shown on screen). */
export const otpAvailable = async () => {
  const c = await getConfig();
  return process.env.NODE_ENV !== "production" || (c.smsProvider || "console") !== "console" || (c.emailProvider || "console") !== "console";
};

const hash = (s: string) => createHash("sha256").update(s + (process.env.AUTH_SECRET || "")).digest("hex");

/**
 * Creates a 6 digit one-time code and delivers it by SMS or email.
 * Delivery providers are pluggable via SMS_PROVIDER / EMAIL_PROVIDER.
 * Returns the code only in "console" (development) mode so the UI can show it.
 */
export async function sendOtp(target: string, channel: "sms" | "email") {
  const recent = await db.otpCode.count({
    where: { target, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= 3) throw new Error("Too many codes requested. Please wait a minute.");
  const code = String(randomInt(100000, 999999));
  await db.otpCode.create({
    data: { target, codeHash: hash(code), expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  const c = await getConfig();
  const provider = channel === "sms" ? c.smsProvider : c.emailProvider;
  const text = `${code} is your Power Sector Academy verification code. It expires in 10 minutes.`;
  switch (provider) {
    case "msg91":
      await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: c.msg91AuthKey },
        body: JSON.stringify({ template_id: c.msg91TemplateId, mobile: target.replace("+", ""), otp: code }),
      });
      return { devCode: undefined };
    case "twilio": {
      const sid = c.twilioAccountSid;
      const body = new URLSearchParams({ To: target, From: c.twilioFrom, Body: text });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + Buffer.from(`${sid}:${c.twilioAuthToken}`).toString("base64") },
        body,
      });
      return { devCode: undefined };
    }
    case "resend":
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: c.emailFrom, to: target, subject: "Your verification code", text }),
      });
      return { devCode: undefined };
    default:
      console.log(`[OTP] ${target}: ${code}`);
      return { devCode: process.env.NODE_ENV === "production" ? undefined : code };
  }
}

export async function verifyOtp(target: string, code: string) {
  const otp = await db.otpCode.findFirst({
    where: { target, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) return false;
  if (otp.codeHash !== hash(code.trim())) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.otpCode.deleteMany({ where: { target } });
  return true;
}
