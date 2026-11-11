import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { CourseForm } from "./CourseForm";
import { requireAdmin } from "@/lib/auth";

export default async function AdminCourses() {
  const me = await requireAdmin();
  const [courses, categories] = await Promise.all([
    db.course.findMany({ where: me.role === "ADMIN" ? {} : { ownerId: me.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { enrollments: true, modules: true } } } }),
    db.category.findMany(),
  ]);
  return (
    <div>
      <h1 className="h-section">{me.role === "ADMIN" ? "Courses" : "My courses"}</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Modules</th><th className="px-4 py-3">Learners</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>{courses.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3"><Link className="font-medium hover:text-brand-600" href={`/admin/courses/${c.id}`}>{c.title}</Link></td>
              <td className="px-4 py-3">{inr(c.priceInPaise)}</td><td className="px-4 py-3">{c._count.modules}</td><td className="px-4 py-3">{c._count.enrollments}</td>
              <td className="px-4 py-3">{c.published ? <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Published</span> : <span className="chip">Draft</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <h2 className="mt-10 text-xl font-bold">Create a course</h2>
      <CourseForm categories={categories} />
    </div>
  );
}
