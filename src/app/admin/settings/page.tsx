import { requireFullAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSiteSettings } from "@/app/actions/admin";
import { s3Configured } from "@/lib/storage";
import { pushConfigured } from "@/lib/push";
import { tutorEnabled } from "@/lib/tutor";
import { otpAvailable } from "@/lib/otp";
import { paymentsEnabled } from "@/lib/payments";

export const metadata = { title: "Settings" };

const fields: [string, string, string?][] = [
  ["companyName", "Business / legal name"], ["gstin", "GSTIN (shown on invoices)"], ["address", "Registered address"],
  ["supportEmail", "Support email"], ["supportPhone", "Support phone"], ["whatsapp", "WhatsApp number (with country code)", "+91 98XXXXXXXX"],
  ["linkedin", "LinkedIn page URL"], ["youtube", "YouTube channel URL"], ["instagram", "Instagram URL"],
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const s = await getSettings();
  const { saved } = await searchParams;
  const status: [string, boolean, string][] = [
    ["Online payments", paymentsEnabled(), "Set PAYMENT_PROVIDER=razorpay and the Razorpay keys on Render"],
    ["Login by one-time code (SMS / email)", otpAvailable(), "Set SMS_PROVIDER=msg91 (or EMAIL_PROVIDER=resend) and its keys"],
    ["File storage bucket", s3Configured(), "Optional: add S3_* keys for Cloudflare R2. Until then files are kept in the database (up to 15 MB each)"],
    ["Push notifications to the apps", pushConfigured(), "Add FIREBASE_SERVICE_ACCOUNT from your Firebase project"],
    ["AI study assistant", tutorEnabled(), "Add ANTHROPIC_API_KEY"],
  ];
  return (
    <div>
      <h1 className="h-section">Settings</h1>
      {saved && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Settings saved.</p>}

      <div className="card mt-6 p-6">
        <div className="font-semibold">Integrations</div>
        <p className="muted text-sm">These are switched on with environment variables in your Render dashboard (Environment tab), so secret keys never sit in the database.</p>
        <ul className="mt-4 space-y-3 text-sm">
          {status.map(([k, on, how]) => (
            <li key={k} className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} /><div><b>{k}</b>: {on ? "on" : "off"}{!on && <div className="muted text-xs">{how}</div>}</div></li>
          ))}
        </ul>
      </div>

      <form action={saveSiteSettings} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        <div className="font-semibold sm:col-span-2">Business details and support</div>
        {fields.map(([k, label, ph]) => (
          <div key={k} className={k === "address" ? "sm:col-span-2" : ""}><label className="label" htmlFor={k}>{label}</label><input id={k} name={k} defaultValue={s[k as keyof typeof s]} placeholder={ph} className="input" /></div>
        ))}
        <div className="font-semibold sm:col-span-2">Policies (Markdown). Required by Razorpay, Google Play and the App Store.</div>
        {(["terms", "privacy", "refunds"] as const).map((k) => (
          <div key={k} className="sm:col-span-2"><label className="label" htmlFor={k}>{{ terms: "Terms of use", privacy: "Privacy policy", refunds: "Refund policy" }[k]} <a className="text-xs text-brand-600" href={`/${k}`} target="_blank">view page</a></label><textarea id={k} name={k} rows={8} defaultValue={s[k]} className="input font-mono text-[13px]" /></div>
        ))}
        <div className="sm:col-span-2"><button className="btn-primary">Save settings</button></div>
      </form>
    </div>
  );
}
