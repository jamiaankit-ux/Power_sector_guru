import Link from "next/link";
import { requireFullAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSiteSettings } from "@/app/actions/admin";
import { Area, Field, PageHead, SaveBar, Saved, Section } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/UploadField";

export const metadata = { title: "Brand and menus" };

export default async function Brand({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const s = await getSettings();
  const { saved } = await searchParams;
  return (
    <form action={saveSiteSettings} className="space-y-5">
      <PageHead title="Brand and menus" text="Your name, logo and the text that appears on every page." />
      <Saved show={saved} />
      <Section title="Brand">
        <Field name="siteName" label="Academy name" value={s.siteName} hint="Shown in the menu, browser tab and emails. The last word is highlighted." />
        <Field name="tagline" label="Tagline" value={s.tagline} />
        <div className="sm:col-span-2"><label className="label">Logo (optional; a PNG or SVG about 64 px tall)</label><UploadField name="logoUrl" defaultValue={s.logoUrl} accept="image/*" placeholder="Upload or paste an image link" /></div>
      </Section>
      <Section title="Footer">
        <Area name="footerAbout" label="About text" value={s.footerAbout} rows={2} />
        <Field name="linkedin" label="LinkedIn page" value={s.linkedin} />
        <Field name="youtube" label="YouTube channel" value={s.youtube} />
        <Field name="instagram" label="Instagram" value={s.instagram} />
      </Section>
      <section className="card p-5 text-sm sm:p-6">
        <h2 className="text-base font-bold">Menus</h2>
        <p className="muted mt-1">The top menu shows Courses, Plans, Leaderboard and Verify certificate, plus any page you tick “Show in top menu” on. Footer links work the same way. Add or edit pages in <Link className="font-semibold text-brand-600" href="/admin/site/pages">Pages</Link>; support contacts and policies are in <Link className="font-semibold text-brand-600" href="/admin/settings">Business and policies</Link>.</p>
      </section>
      <SaveBar back="/admin/site/brand" preview="/" />
    </form>
  );
}
