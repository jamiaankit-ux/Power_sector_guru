import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { courseCards } from "@/lib/catalog";
import { CourseCard } from "@/components/CourseCard";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Courses" };

export default async function Courses({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.CourseWhereInput = { published: true };
  if (sp.q) where.OR = [{ title: { contains: sp.q } }, { subtitle: { contains: sp.q } }, { tags: { contains: sp.q.toLowerCase() } }, { instructorName: { contains: sp.q } }];
  if (sp.category) where.category = { slug: sp.category };
  if (sp.level) where.level = sp.level;
  if (sp.price === "free") where.priceInPaise = 0;
  if (sp.price === "paid") where.priceInPaise = { gt: 0 };
  const [cards, categories] = await Promise.all([courseCards(where), db.category.findMany()]);
  const sel = "input w-auto py-2";
  return (
    <div className="container-x py-10">
      <h1 className="h-section">All courses</h1>
      <p className="muted mt-1">Industry-focused programmes for every stage of your power sector career.</p>
      <form className="card mt-6 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Search DSM, solar, protection, tariff…" />
        </div>
        <select name="category" defaultValue={sp.category ?? ""} className={sel}>
          <option value="">All topics</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="level" defaultValue={sp.level ?? ""} className={sel}>
          <option value="">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
        <select name="price" defaultValue={sp.price ?? ""} className={sel}>
          <option value="">Free and paid</option><option value="free">Free</option><option value="paid">Paid</option>
        </select>
        <button className="btn-primary">Apply</button>
      </form>
      <div className="muted mt-6 text-sm">{cards.length} course{cards.length === 1 ? "" : "s"}</div>
      <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{cards.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
      {cards.length === 0 && <div className="card mt-6 p-10 text-center"><p className="muted">No courses match these filters.</p></div>}
    </div>
  );
}
