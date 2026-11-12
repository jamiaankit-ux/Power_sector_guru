import { requireFullAdmin } from "@/lib/auth";
import { getSettings, on } from "@/lib/settings";
import { saveSiteSettings } from "@/app/actions/admin";
import { Area, Field, PageHead, SaveBar, Saved, Section, Toggle } from "@/components/admin/ui";

export const metadata = { title: "Learner dashboard" };

export default async function DashboardContent({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireFullAdmin();
  const s = await getSettings();
  const { saved } = await searchParams;
  return (
    <form action={saveSiteSettings} className="space-y-5">
      <PageHead title="Learner dashboard" text="What learners read on “My learning” after they sign in. Write {name} where the learner's first name should appear." />
      <Saved show={saved} />
      <Section title="Greeting">
        <Field name="dashGreeting" label="Heading" value={s.dashGreeting} wide />
      </Section>
      <Section title="Welcome message" hint="Shown once, right after a learner registers.">
        <Field name="dashWelcomeTitle" label="Title" value={s.dashWelcomeTitle} wide />
        <Area name="dashWelcomeText" label="Text" value={s.dashWelcomeText} rows={2} />
      </Section>
      <Section title="Notice" hint="A highlighted box at the top of every learner's dashboard: exam dates, live sessions, new courses. For news items use Announcements.">
        <Toggle name="dashNoticeEnabled" label="Show the notice" checked={on(s.dashNoticeEnabled)} />
        <Field name="dashNoticeTitle" label="Title" value={s.dashNoticeTitle} wide />
        <Area name="dashNoticeText" label="Text" value={s.dashNoticeText} rows={2} />
        <Field name="dashNoticeLabel" label="Button text" value={s.dashNoticeLabel} />
        <Field name="dashNoticeUrl" label="Button link" value={s.dashNoticeUrl} placeholder="/courses/your-course" />
      </Section>
      <SaveBar back="/admin/site/dashboard" preview="/dashboard" />
    </form>
  );
}
