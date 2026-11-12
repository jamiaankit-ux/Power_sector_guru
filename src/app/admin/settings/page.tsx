import { requireFullAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSiteSettings } from "@/app/actions/admin";
import { Field, PageHead, SaveBar, Saved, Section } from "@/components/admin/ui";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";

export const metadata = { title: "Business and policies" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const s = await getSettings();
  const { saved } = await searchParams;
  return (
    <form action={saveSiteSettings} className="space-y-5">
      <PageHead title="Business and policies" text="Your legal details, how learners reach you, and the policy pages that Razorpay, Google Play and the App Store require." />
      <Saved show={saved} />
      <Section title="Business details" hint="Printed on invoices and in the footer.">
        <Field name="companyName" label="Business / legal name" value={s.companyName} />
        <Field name="gstin" label="GSTIN" value={s.gstin} />
        <Field name="address" label="Registered address" value={s.address} wide />
      </Section>
      <Section title="Support contacts" hint="Shown in the footer and on policy pages.">
        <Field name="supportEmail" label="Support email" value={s.supportEmail} type="email" />
        <Field name="supportPhone" label="Support phone" value={s.supportPhone} />
        <Field name="whatsapp" label="WhatsApp number (with country code)" value={s.whatsapp} placeholder="+91 98XXXXXXXX" />
      </Section>
      {(["terms", "privacy", "refunds"] as const).map((k) => (
        <section key={k} className="card p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold">{{ terms: "Terms of use", privacy: "Privacy policy", refunds: "Refund policy" }[k]}</h2><a className="text-sm font-semibold text-brand-600" href={`/${k}`} target="_blank">View page</a></div>
          <div className="mt-3"><MarkdownEditor name={k} defaultValue={s[k]} rows={10} /></div>
        </section>
      ))}
      <SaveBar back="/admin/settings" />
    </form>
  );
}
