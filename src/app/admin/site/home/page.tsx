import { requireFullAdmin } from "@/lib/auth";
import { getSettings, list, on } from "@/lib/settings";
import { saveSiteSettings } from "@/app/actions/admin";
import { Area, Field, PageHead, SaveBar, Saved, Section, Toggle } from "@/components/admin/ui";
import { ListEditor } from "@/components/admin/ListEditor";
import { UploadField } from "@/components/admin/UploadField";

export const metadata = { title: "Home page" };

export default async function HomeContent({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const s = await getSettings();
  const { saved } = await searchParams;
  return (
    <form action={saveSiteSettings} className="space-y-5">
      <PageHead title="Home page" text="Everything visitors read on the first page of your website. Leave a list empty to hide that section." />
      <Saved show={saved} />

      <Section title="Announcement bar" hint="A thin strip at the very top of every page, for launches and offers.">
        <Toggle name="barEnabled" label="Show the announcement bar" checked={on(s.barEnabled)} />
        <Field name="barText" label="Text" value={s.barText} wide placeholder="New batch starts 1 December. Early-bird price ends Sunday." />
        <Field name="barLinkLabel" label="Link text" value={s.barLinkLabel} placeholder="Enrol now" />
        <Field name="barLinkUrl" label="Link address" value={s.barLinkUrl} placeholder="/courses" />
      </Section>

      <Section title="Top banner" hint="The big headline area.">
        <Field name="heroTitle" label="Headline" value={s.heroTitle} />
        <Field name="heroHighlight" label="Highlighted part (yellow)" value={s.heroHighlight} />
        <Area name="heroText" label="Text under the headline" value={s.heroText} />
        <Field name="heroPrimaryLabel" label="Main button text" value={s.heroPrimaryLabel} />
        <Field name="heroPrimaryUrl" label="Main button link" value={s.heroPrimaryUrl} />
        <Field name="heroSecondaryLabel" label="Second button text" value={s.heroSecondaryLabel} />
        <Field name="heroSecondaryUrl" label="Second button link" value={s.heroSecondaryUrl} />
        <div className="sm:col-span-2"><label className="label">Banner picture (optional, replaces the progress illustration)</label><UploadField name="heroImage" defaultValue={s.heroImage} accept="image/*" placeholder="Upload or paste an image link" /></div>
        <Toggle name="showStats" label="Show live numbers (learners, lessons, certificates)" checked={on(s.showStats)} />
      </Section>

      <Section title="Featured courses" hint="Courses marked “Featured” in the course editor appear here.">
        <Field name="featuredTitle" label="Heading" value={s.featuredTitle} />
        <Field name="featuredText" label="Text" value={s.featuredText} />
      </Section>

      <Section title="Why learn with us" hint="Benefit cards. Icons are added automatically.">
        <Field name="featuresTitle" label="Heading" value={s.featuresTitle} wide />
        <Area name="featuresText" label="Text" value={s.featuresText} rows={2} />
        <ListEditor name="features" initial={list(s.features)} fields={[{ key: "title", label: "Title" }, { key: "text", label: "Description" }]} addLabel="Add benefit" />
      </Section>

      <Section title="Testimonials" hint="Only add real feedback from your learners.">
        <Field name="testimonialsTitle" label="Heading" value={s.testimonialsTitle} wide />
        <ListEditor name="testimonials" initial={list(s.testimonials)} fields={[{ key: "name", label: "Name" }, { key: "role", label: "Role, organisation" }, { key: "quote", label: "What they said", area: true }]} addLabel="Add testimonial" />
      </Section>

      <Section title="Questions and answers">
        <Field name="faqTitle" label="Heading" value={s.faqTitle} wide />
        <ListEditor name="faq" initial={list(s.faq)} fields={[{ key: "question", label: "Question" }, { key: "answer", label: "Answer", area: true }]} addLabel="Add question" />
      </Section>

      <Section title="Subscription banner" hint="The blue banner near the bottom (hidden inside the phone apps).">
        <Field name="ctaTitle" label="Heading" value={s.ctaTitle} wide />
        <Area name="ctaText" label="Text" value={s.ctaText} rows={2} />
        <Field name="ctaLabel" label="Button text" value={s.ctaLabel} />
        <Field name="ctaUrl" label="Button link" value={s.ctaUrl} />
      </Section>

      <Section title="Courses page and Plans page">
        <Field name="coursesTitle" label="Courses page heading" value={s.coursesTitle} />
        <Field name="coursesText" label="Courses page text" value={s.coursesText} />
        <Field name="pricingTitle" label="Plans page heading" value={s.pricingTitle} />
        <Field name="pricingText" label="Plans page text" value={s.pricingText} />
      </Section>

      <SaveBar back="/admin/site/home" preview="/" />
    </form>
  );
}
