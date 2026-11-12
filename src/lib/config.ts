import "server-only";
import { cache } from "react";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db } from "./db";

/**
 * Integration settings (payment gateway, SMS, AI, storage, video, push) that the owner controls from Admin > Integrations.
 * A value saved in the admin app wins; otherwise the environment variable is used. Secret values are encrypted
 * in the database with a key derived from AUTH_SECRET and are never sent back to the browser.
 */
type Field = { env: string; def?: string; secret?: boolean };
export const CONFIG_FIELDS = {
  paymentProvider: { env: "PAYMENT_PROVIDER", def: "mock" },
  razorpayKeyId: { env: "RAZORPAY_KEY_ID" },
  razorpayKeySecret: { env: "RAZORPAY_KEY_SECRET", secret: true },
  stripeSecretKey: { env: "STRIPE_SECRET_KEY", secret: true },
  taxPercent: { env: "TAX_PERCENT", def: "18" },
  allowTestPayments: { env: "ALLOW_TEST_PAYMENTS", def: "false" },
  smsProvider: { env: "SMS_PROVIDER", def: "console" },
  msg91AuthKey: { env: "MSG91_AUTH_KEY", secret: true },
  msg91TemplateId: { env: "MSG91_TEMPLATE_ID" },
  twilioAccountSid: { env: "TWILIO_ACCOUNT_SID" },
  twilioAuthToken: { env: "TWILIO_AUTH_TOKEN", secret: true },
  twilioFrom: { env: "TWILIO_FROM" },
  emailProvider: { env: "EMAIL_PROVIDER", def: "console" },
  resendApiKey: { env: "RESEND_API_KEY", secret: true },
  emailFrom: { env: "EMAIL_FROM" },
  anthropicApiKey: { env: "ANTHROPIC_API_KEY", secret: true },
  tutorModel: { env: "TUTOR_MODEL", def: "claude-opus-5-5" },
  tutorDailyLimit: { env: "TUTOR_DAILY_LIMIT", def: "30" },
  firebaseServiceAccount: { env: "FIREBASE_SERVICE_ACCOUNT", secret: true },
  s3Bucket: { env: "S3_BUCKET" },
  s3Endpoint: { env: "S3_ENDPOINT" },
  s3Region: { env: "S3_REGION", def: "auto" },
  s3AccessKeyId: { env: "S3_ACCESS_KEY_ID" },
  s3SecretAccessKey: { env: "S3_SECRET_ACCESS_KEY", secret: true },
  s3PublicUrl: { env: "S3_PUBLIC_URL" },
  bunnyLibraryId: { env: "BUNNY_STREAM_LIBRARY_ID" },
  bunnyApiKey: { env: "BUNNY_STREAM_API_KEY", secret: true },
  bunnyCdnHost: { env: "BUNNY_STREAM_CDN_HOST" },
} satisfies Record<string, Field>;
export type ConfigKey = keyof typeof CONFIG_FIELDS;
export type Config = Record<ConfigKey, string>;

const PREFIX = "cfg.";
const key = () => createHash("sha256").update("cfg:" + (process.env.AUTH_SECRET || "dev-secret-change-me")).digest();

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}
function decrypt(stored: string) {
  if (!stored.startsWith("enc:v1:")) return stored;
  try {
    const [, , iv, tag, data] = stored.split(":");
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return ""; // AUTH_SECRET changed: the owner re-enters the key
  }
}

const load = cache(async () => {
  const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } } });
  return new Map(rows.map((r) => [r.key.slice(PREFIX.length), decrypt(r.value)]));
});

export const getConfig = cache(async (): Promise<Config> => {
  const saved = await load();
  const out = {} as Config;
  for (const [k, f] of Object.entries(CONFIG_FIELDS) as [ConfigKey, Field][]) out[k] = saved.get(k) || process.env[f.env] || f.def || "";
  return out;
});

/** For the admin screen: plain values, and for secrets only whether one is set and where it comes from. */
export async function configForAdmin() {
  const saved = await load();
  const out = {} as Record<ConfigKey, { value: string; set: boolean; source: "admin" | "server" | "none"; secret: boolean }>;
  for (const [k, f] of Object.entries(CONFIG_FIELDS) as [ConfigKey, Field][]) {
    const a = saved.get(k), e = process.env[f.env];
    const secret = !!f.secret;
    out[k] = { value: secret ? "" : a || e || f.def || "", set: !!(a || e), source: a ? "admin" : e ? "server" : "none", secret };
  }
  return out;
}

/** Saves values from the admin app. An empty secret keeps the stored one; pass clear=[keys] to remove. */
export async function saveConfig(values: Partial<Config>, clear: string[] = []) {
  for (const [k, v] of Object.entries(values)) {
    const f = (CONFIG_FIELDS as Record<string, Field>)[k];
    if (!f || v === undefined) continue;
    const val = v.trim();
    if (!val) {
      if (!f.secret) await db.setting.deleteMany({ where: { key: PREFIX + k } });
      continue;
    }
    const value = f.secret ? encrypt(val) : val;
    await db.setting.upsert({ where: { key: PREFIX + k }, update: { value }, create: { key: PREFIX + k, value } });
  }
  for (const k of clear) if (k in CONFIG_FIELDS) await db.setting.deleteMany({ where: { key: PREFIX + k } });
}
