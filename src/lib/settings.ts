import "server-only";
import { cache } from "react";
import { db } from "./db";

export const DEFAULT_SETTINGS = {
  supportEmail: "",
  supportPhone: "",
  whatsapp: "",
  companyName: "Power Sector Academy",
  gstin: "",
  address: "",
  linkedin: "",
  youtube: "",
  instagram: "",
  privacy: `# Privacy Policy

_Last updated: add the date._

Power Sector Academy ("we") collects the information you give us when you register (name, email, mobile number, organisation) and the learning activity you create (progress, quiz results, certificates) so that we can provide the courses, track your performance and issue certificates.

- We do not sell your personal data.
- Payments are processed by our payment partner; we do not store card details.
- You can ask us to correct or delete your data by contacting support.

Replace this text with your own policy before launch.`,
  terms: `# Terms of Use

_Last updated: add the date._

By creating an account you agree to use the courses for your own learning, not to share your login or redistribute course material, and to follow these terms.

Replace this text with your own terms before launch.`,
  refunds: `# Refund Policy

_Last updated: add the date._

Describe here when learners can request a refund (for example, within 7 days of purchase if less than 20% of the course has been watched) and how to request it.

Replace this text with your own policy before launch.`,
};
export type Settings = typeof DEFAULT_SETTINGS;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) (s as Record<string, string>)[r.key] = r.value;
  return s;
});

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
