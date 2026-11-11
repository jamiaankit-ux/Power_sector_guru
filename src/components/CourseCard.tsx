import Link from "next/link";
import { BookOpen, Clock, Star } from "lucide-react";
import { duration, inr } from "@/lib/format";

export type CourseCardData = {
  slug: string; title: string; subtitle: string; level: string; coverColor: string; instructorName: string;
  priceInPaise: number; mrpInPaise: number; lessons: number; seconds: number; rating?: number; reviews?: number; category?: string | null;
  progress?: number; coverImage?: string | null;
};

export function CourseCover({ title, color, category, small, image }: { title: string; color: string; category?: string | null; small?: boolean; image?: string | null }) {
  if (image)
    return (
      <div className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 ${small ? "h-28" : "h-40"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        {!small && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">{category && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">{category}</div>}<div className="line-clamp-2 text-lg font-bold leading-snug text-white">{title}</div></div>}
      </div>
    );
  return (
    <div className={`relative overflow-hidden ${small ? "h-28" : "h-40"}`} style={{ background: `linear-gradient(135deg, ${color}, #0b1b3f)` }}>
      <svg className="absolute -right-6 -top-6 h-48 w-48 opacity-20" viewBox="0 0 100 100" aria-hidden>
        <path d="M58 5 25 55h20l-6 40 36-52H55l3-38z" fill="#fbbf24" />
      </svg>
      <svg className="absolute bottom-0 left-0 h-16 w-full opacity-25" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 30 Q 25 0 50 30 T 100 30 T 150 30 T 200 30 T 250 30 T 300 30 T 350 30 T 400 30" stroke="white" strokeWidth="2" fill="none" />
      </svg>
      <div className="absolute inset-x-4 bottom-3">
        {category && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">{category}</div>}
        {!small && <div className="line-clamp-2 text-lg font-bold leading-snug text-white">{title}</div>}
      </div>
    </div>
  );
}

export function CourseCard({ c }: { c: CourseCardData }) {
  return (
    <Link href={`/courses/${c.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <CourseCover title={c.title} color={c.coverColor} category={c.category} image={c.coverImage} />
      <div className="flex flex-1 flex-col p-4">
        <p className="muted line-clamp-2 text-sm">{c.subtitle}</p>
        <div className="muted mt-2 text-xs">{c.instructorName}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip">{c.level}</span>
          <span className="chip"><BookOpen className="h-3 w-3" />{c.lessons} lessons</span>
          <span className="chip"><Clock className="h-3 w-3" />{duration(c.seconds)}</span>
        </div>
        {c.rating ? (
          <div className="mt-2 flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-volt-400 text-volt-400" /><b>{c.rating.toFixed(1)}</b><span className="muted">({c.reviews})</span></div>
        ) : null}
        <div className="mt-auto pt-4">
          {c.progress !== undefined ? (
            <div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${c.progress}%` }} /></div>
              <div className="muted mt-1 text-xs">{c.progress}% complete</div>
            </div>
          ) : (
            <div className="hide-in-app flex items-baseline gap-2">
              <span className="text-lg font-bold">{inr(c.priceInPaise)}</span>
              {c.mrpInPaise > c.priceInPaise && <span className="muted text-sm line-through">{inr(c.mrpInPaise)}</span>}
              {c.mrpInPaise > c.priceInPaise && <span className="text-xs font-semibold text-emerald-600">{Math.round((1 - c.priceInPaise / c.mrpInPaise) * 100)}% off</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
