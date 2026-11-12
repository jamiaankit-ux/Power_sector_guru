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
  // ---- Brand ----
  siteName: "Power Sector Academy",
  tagline: "Making you ready for AI-enabled Power Sector",
  logoUrl: "",
  footerAbout: "Industry-grade learning for engineers and professionals across generation, transmission, distribution, markets and regulation.",
  // ---- Announcement bar (top of every page) ----
  barEnabled: "false",
  barText: "",
  barLinkLabel: "",
  barLinkUrl: "",
  // ---- Home page ----
  heroTitle: "Master the power sector,",
  heroHighlight: "one lesson at a time.",
  heroText: "Expert-led courses on power systems, grid operations, renewables, electricity markets and regulation. Learn on any device, test yourself with quizzes, and earn verifiable certificates.",
  heroPrimaryLabel: "Explore courses",
  heroPrimaryUrl: "/courses",
  heroSecondaryLabel: "Start free",
  heroSecondaryUrl: "/register",
  heroImage: "",
  showStats: "true",
  featuredTitle: "Featured courses",
  featuredText: "Start with the most popular programmes.",
  featuresTitle: "Everything you need to learn and prove it",
  featuresText: "A complete learning platform designed for working engineers: learn in short sessions, pick up where you left off on any device, and show verified results.",
  features: JSON.stringify([
    { title: "HD video lectures", text: "Adjustable speed and quality, resume where you left off, and timestamped notes." },
    { title: "Study material", text: "Concise notes, worked examples and downloadable slides for every topic." },
    { title: "Quizzes and assessments", text: "Timed quizzes with instant feedback and explanations." },
    { title: "Performance analytics", text: "Watch hours, streaks, quiz scores and progress across courses." },
    { title: "Verifiable certificates", text: "PDF certificates with a QR code anyone can verify online." },
    { title: "AI study assistant", text: "Ask doubts on any lesson and get an instant, grounded answer." },
    { title: "Any device", text: "Android, iPhone, Windows and Mac, with offline videos in the phone apps." },
    { title: "Secure payments", text: "UPI, cards and net banking with discount codes and bundles." },
  ]),
  testimonialsTitle: "What learners say",
  testimonials: "[]",
  faqTitle: "Frequently asked questions",
  faq: "[]",
  ctaTitle: "Get unlimited access with a subscription",
  ctaText: "Every course, every new release, certificates included. Or save with curated career bundles.",
  ctaLabel: "See plans",
  ctaUrl: "/pricing",
  // ---- Learner dashboard ----
  dashGreeting: "Hi {name}, keep the current flowing",
  dashWelcomeTitle: "Welcome to Power Sector Academy, {name}! ⚡",
  dashWelcomeText: "Start with our free Power System Fundamentals course, or browse the full catalogue.",
  dashNoticeEnabled: "false",
  dashNoticeTitle: "",
  dashNoticeText: "",
  dashNoticeLabel: "",
  dashNoticeUrl: "",
  // ---- Other pages ----
  coursesTitle: "All courses",
  coursesText: "Browse every programme, filter by topic and level.",
  pricingTitle: "Plans and bundles",
  pricingText: "Pick a subscription for everything, or a bundle for your career track.",
};
export type Settings = typeof DEFAULT_SETTINGS;

export type Item = Record<string, string>;
/** Reads a list setting (features, testimonials, FAQ) saved as JSON. */
export function list(json: string): Item[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
  } catch {
    return [];
  }
}
export const on = (v: string) => v === "true" || v === "on";

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
