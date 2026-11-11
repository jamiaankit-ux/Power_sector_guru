import { getSettings, type Settings } from "@/lib/settings";
import { markdown } from "@/lib/markdown";

export async function LegalPage({ field }: { field: keyof Pick<Settings, "privacy" | "terms" | "refunds"> }) {
  const s = await getSettings();
  return (
    <div className="container-x py-12">
      <article className="prose-pa card mx-auto max-w-3xl p-6 sm:p-10" dangerouslySetInnerHTML={{ __html: markdown(s[field]) }} />
      {(s.supportEmail || s.supportPhone) && (
        <p className="muted mx-auto mt-6 max-w-3xl text-center text-sm">Questions? Contact us{s.supportEmail && <> at <a className="text-brand-600" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></>}{s.supportPhone && <> or call {s.supportPhone}</>}.</p>
      )}
    </div>
  );
}
