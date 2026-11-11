import "server-only";
import { db } from "./db";
import type { CourseCardData } from "@/components/CourseCard";
import type { Prisma } from "@prisma/client";

export async function courseCards(where: Prisma.CourseWhereInput = { published: true }): Promise<CourseCardData[]> {
  const courses = await db.course.findMany({
    where,
    include: { category: true, modules: { include: { lessons: { select: { durationSec: true } } } }, reviews: { select: { rating: true } } },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });
  return courses.map((c) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    return {
      slug: c.slug, title: c.title, subtitle: c.subtitle, level: c.level, coverColor: c.coverColor, instructorName: c.instructorName,
      priceInPaise: c.priceInPaise, mrpInPaise: c.mrpInPaise, lessons: lessons.length, seconds: lessons.reduce((a, l) => a + l.durationSec, 0),
      rating: c.reviews.length ? c.reviews.reduce((a, r) => a + r.rating, 0) / c.reviews.length : undefined,
      reviews: c.reviews.length, category: c.category?.name,
    };
  });
}
