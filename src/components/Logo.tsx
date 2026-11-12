export const TAGLINE = "Making you ready for AI-enabled Power Sector";

/** Brand mark. Name, tagline and logo image come from Admin > Website > Brand when passed in. */
export function Logo({ className = "", tagline = false, name = "Power Sector Academy", taglineText = TAGLINE, logoUrl = "" }: { className?: string; tagline?: boolean; name?: string; taglineText?: string; logoUrl?: string }) {
  const words = name.trim().split(" ");
  const last = words.length > 1 ? words.pop() : "";
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-auto max-w-32 object-contain" />
      ) : (
        <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
          <rect width="32" height="32" rx="9" fill="#1d4ed8" />
          <path d="M18 4 8 18h7l-2 10 11-15h-7l1-9z" fill="#fbbf24" />
        </svg>
      )}
      <span className="flex flex-col leading-tight"><span>{words.join(" ")} {last && <span className="text-brand-600 dark:text-volt-400">{last}</span>}</span>{tagline && <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{taglineText}</span>}</span>
    </span>
  );
}
