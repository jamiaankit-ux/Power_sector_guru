import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, FileText, ListChecks, PlayCircle, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { duration } from "@/lib/format";
import { addLesson, addModule, deleteCourse, deleteLesson, deleteModule, moveLesson, moveModule, renameModule } from "@/app/actions/admin";
import { CourseForm } from "../CourseForm";

const icons = { VIDEO: PlayCircle, READING: FileText, QUIZ: ListChecks } as Record<string, React.ElementType>;

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, categories] = await Promise.all([
    db.course.findUnique({ where: { id }, include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } } }),
    db.category.findMany(),
  ]);
  if (!course) notFound();
  const iconBtn = "rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/admin/courses" className="muted text-sm">← Courses</Link><h1 className="h-section">{course.title}</h1></div>
        <Link href={`/courses/${course.slug}`} className="btn-ghost"><ExternalLink className="h-4 w-4" />View page</Link>
      </div>

      <h2 className="mt-8 text-xl font-bold">Curriculum</h2>
      <div className="mt-4 space-y-4">
        {course.modules.map((m, mi) => (
          <div key={m.id} className="card">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
              <span className="muted text-sm font-bold">{mi + 1}.</span>
              <form action={renameModule} className="flex flex-1 gap-2"><input type="hidden" name="id" value={m.id} /><input name="title" defaultValue={m.title} className="input py-1.5 font-semibold" /><button className="btn-ghost py-1.5">Rename</button></form>
              <form action={moveModule}><input type="hidden" name="id" value={m.id} /><button name="dir" value="up" className={iconBtn} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button><button name="dir" value="down" className={iconBtn} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button></form>
              <form action={deleteModule}><input type="hidden" name="id" value={m.id} /><button className={`${iconBtn} hover:text-rose-600`} aria-label="Delete module"><Trash2 className="h-4 w-4" /></button></form>
            </div>
            <ul>
              {m.lessons.map((l) => {
                const Icon = icons[l.type] ?? PlayCircle;
                return (
                  <li key={l.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-2 text-sm last:border-0 dark:border-slate-800/50">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <Link href={`/admin/lessons/${l.id}`} className="flex-1 hover:text-brand-600">{l.title}</Link>
                    {l.isPreview && <span className="chip">Preview</span>}
                    {l.type === "VIDEO" && !l.videoUrl && <span className="chip bg-amber-50 text-amber-700">No video</span>}
                    <span className="muted text-xs">{duration(l.durationSec)}</span>
                    <form action={moveLesson}><input type="hidden" name="id" value={l.id} /><button name="dir" value="up" className={iconBtn} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button><button name="dir" value="down" className={iconBtn} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button></form>
                    <form action={deleteLesson}><input type="hidden" name="id" value={l.id} /><button className={`${iconBtn} hover:text-rose-600`} aria-label="Delete lesson"><Trash2 className="h-3.5 w-3.5" /></button></form>
                  </li>
                );
              })}
            </ul>
            <form action={addLesson} className="flex flex-wrap gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
              <input type="hidden" name="moduleId" value={m.id} />
              <input name="title" placeholder="New lesson title" className="input flex-1 py-1.5" required />
              <select name="type" className="input w-auto py-1.5"><option value="VIDEO">Video</option><option value="READING">Study material</option><option value="QUIZ">Quiz</option></select>
              <button className="btn-primary py-1.5">Add lesson</button>
            </form>
          </div>
        ))}
        <form action={addModule} className="flex gap-2"><input type="hidden" name="courseId" value={course.id} /><input name="title" className="input" placeholder="New module title" required /><button className="btn-primary">Add module</button></form>
      </div>

      <h2 className="mt-10 text-xl font-bold">Course details</h2>
      <CourseForm course={course} categories={categories} />

      <form action={deleteCourse} className="mt-10"><input type="hidden" name="id" value={course.id} /><button className="btn-danger">Delete course permanently</button></form>
    </div>
  );
}
