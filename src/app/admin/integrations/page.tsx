import { requireFullAdmin } from "@/lib/auth";
import { configForAdmin, type ConfigKey } from "@/lib/config";
import { saveIntegrations } from "@/app/actions/admin";
import { PageHead, Saved } from "@/components/admin/ui";

export const metadata = { title: "Payments and integrations" };

export default async function Integrations({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const c = await configForAdmin();
  const { saved } = await searchParams;

  const Text = ({ k, label, hint, placeholder }: { k: ConfigKey; label: string; hint?: string; placeholder?: string }) => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} name={k} defaultValue={c[k].value} placeholder={placeholder} className="input" autoComplete="off" />{hint && <p className="muted mt-1 text-xs">{hint}</p>}</div>
  );
  const Secret = ({ k, label, hint, area }: { k: ConfigKey; label: string; hint?: string; area?: boolean }) => (
    <div className={area ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={k}>{label} {c[k].set && <span className="chip ml-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">saved{c[k].source === "server" ? " on server" : ""}</span>}</label>
      {area
        ? <textarea id={k} name={k} rows={3} className="input font-mono text-xs" placeholder={c[k].set ? "Saved and hidden. Paste a new one to replace it." : "Paste here"} autoComplete="off" />
        : <input id={k} name={k} type="password" className="input" placeholder={c[k].set ? "Saved and hidden. Type a new one to replace it." : ""} autoComplete="new-password" />}
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
      {c[k].source === "admin" && <label className="muted mt-1 flex items-center gap-1.5 text-xs"><input type="checkbox" name="__clear" value={k} />Remove the saved value</label>}
    </div>
  );
  const Select = ({ k, label, options }: { k: ConfigKey; label: string; options: [string, string][] }) => (
    <div><label className="label" htmlFor={k}>{label}</label><select id={k} name={k} defaultValue={c[k].value} className="input">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  const Card = ({ title, on, hint, children }: { title: string; on: boolean; hint: string; children: React.ReactNode }) => (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-base font-bold">{title}</h2><span className={`chip ${on ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : ""}`}><span className={`h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} />{on ? "Connected" : "Not connected"}</span></div>
      <p className="muted mt-0.5 text-sm">{hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );

  const pay = c.paymentProvider.value;
  const payOn = (pay === "razorpay" && c.razorpayKeyId.set && c.razorpayKeySecret.set) || (pay === "stripe" && c.stripeSecretKey.set);
  return (
    <form action={saveIntegrations} className="space-y-5">
      <PageHead title="Payments and integrations" text="Connect the services your academy uses. Secret keys are encrypted before they are stored and are never shown again; you can replace or remove them at any time." />
      <Saved show={saved} text="Saved. The new settings are in use now." />

      <Card title="Payments" on={!!payOn} hint="Where learners' money goes. Create a Razorpay account (UPI, cards, net banking, wallets), then paste the API keys from Razorpay Dashboard → Account & Settings → API keys.">
        <Select k="paymentProvider" label="Payment gateway" options={[["mock", "None yet (purchases closed)"], ["razorpay", "Razorpay (recommended for India)"], ["stripe", "Stripe"]]} />
        <Text k="taxPercent" label="GST % included in prices" hint="Prices you set are final; this share is shown as GST on invoices." />
        <Text k="razorpayKeyId" label="Razorpay Key ID" placeholder="rzp_live_…" />
        <Secret k="razorpayKeySecret" label="Razorpay Key Secret" />
        <Secret k="stripeSecretKey" label="Stripe secret key (only if using Stripe)" />
        <label className="flex items-start gap-3 sm:col-span-2"><input type="hidden" name="__bools" value="allowTestPayments" /><input type="checkbox" name="allowTestPayments" defaultChecked={c.allowTestPayments.value === "true"} className="mt-1 h-4 w-4" /><span><span className="text-sm font-medium">Allow test payments</span><span className="muted block text-xs">Only for trying the purchase flow before a gateway is connected. Anyone could unlock paid courses for free while this is on.</span></span></label>
      </Card>

      <Card title="Login codes by SMS and email" on={c.smsProvider.value !== "console" || c.emailProvider.value !== "console"} hint="Lets learners sign in or reset their password with a one-time code. In India SMS needs a DLT-approved template; MSG91 guides you through it.">
        <Select k="smsProvider" label="SMS service" options={[["console", "None"], ["msg91", "MSG91"], ["twilio", "Twilio"]]} />
        <Select k="emailProvider" label="Email service" options={[["console", "None"], ["resend", "Resend"]]} />
        <Secret k="msg91AuthKey" label="MSG91 auth key" />
        <Text k="msg91TemplateId" label="MSG91 OTP template ID" />
        <Secret k="resendApiKey" label="Resend API key" />
        <Text k="emailFrom" label="Send emails from" placeholder="Power Sector Academy <no-reply@yourdomain.in>" />
        <Text k="twilioAccountSid" label="Twilio account SID" />
        <Secret k="twilioAuthToken" label="Twilio auth token" />
        <Text k="twilioFrom" label="Twilio sender number" />
      </Card>

      <Card title="Video hosting (Bunny Stream)" on={c.bunnyLibraryId.set && c.bunnyApiKey.set} hint="Upload lecture videos straight from the admin app. Bunny converts them to every quality, streams them fast in India and blocks other sites from embedding them. Create a Stream library at bunny.net and copy these from its API page.">
        <Text k="bunnyLibraryId" label="Video library ID" />
        <Secret k="bunnyApiKey" label="Library API key" />
        <Text k="bunnyCdnHost" label="CDN hostname" placeholder="vz-xxxxxxxx-xxx.b-cdn.net" />
      </Card>

      <Card title="File storage (Cloudflare R2 or any S3 bucket)" on={c.s3Bucket.set && c.s3AccessKeyId.set && c.s3SecretAccessKey.set} hint="Where PDFs, slides and pictures are kept. Optional: without it, files are stored in the database (15 MB each).">
        <Text k="s3Bucket" label="Bucket name" />
        <Text k="s3Endpoint" label="Endpoint" placeholder="https://<account-id>.r2.cloudflarestorage.com" />
        <Text k="s3AccessKeyId" label="Access key ID" />
        <Secret k="s3SecretAccessKey" label="Secret access key" />
        <Text k="s3PublicUrl" label="Public address of the bucket" placeholder="https://files.yourdomain.in" />
        <Text k="s3Region" label="Region" hint="Use auto for Cloudflare R2." />
      </Card>

      <Card title="AI study assistant" on={c.anthropicApiKey.set} hint="Answers learners' doubts on every lesson, using the lesson's own material. Get a key at console.anthropic.com. You pay Anthropic for usage; the daily limit keeps costs predictable.">
        <Secret k="anthropicApiKey" label="Anthropic API key" />
        <Text k="tutorDailyLimit" label="Questions per learner per day" />
        <Text k="tutorModel" label="Model" hint="Leave as is unless you want a cheaper or newer model." />
      </Card>

      <Card title="Push notifications (Firebase)" on={c.firebaseServiceAccount.set} hint="Needed to send notifications to the phone apps. In Firebase: Project settings → Service accounts → Generate new private key, then paste the whole file here.">
        <Secret k="firebaseServiceAccount" label="Service account JSON" area />
      </Card>

      <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4 dark:border-slate-800 dark:bg-slate-900/95">
        <button className="btn-primary">Save integrations</button>
        <span className="muted hidden text-xs sm:inline">Takes effect immediately, no redeploy needed.</span>
      </div>
    </form>
  );
}
