import { saveCourse } from "@/app/actions/admin";
import { parseList } from "@/lib/format";
import type { Category, Course } from "@prisma/client";
import { UploadField } from "@/components/admin/UploadField";

export function CourseForm({ course, categories }: { course?: Course; categories: Category[] }) {
  const c = course;
  return (
    <form action={saveCourse} className="card mt-4 grid gap-4 p-6 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="sm:col-span-2"><label className="label">Title</label><input name="title" defaultValue={c?.title} className="input" required /></div>
      <div className="sm:col-span-2"><label className="label">Subtitle</label><input name="subtitle" defaultValue={c?.subtitle} className="input" required /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" defaultValue={c?.description} rows={4} className="input" required /></div>
      <div><label className="label">Category</label><select name="categoryId" defaultValue={c?.categoryId ?? ""} className="input"><option value="">None</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div><label className="label">Level</label><select name="level" defaultValue={c?.level} className="input"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
      <div><label className="label">Instructor name</label><input name="instructorName" defaultValue={c?.instructorName} className="input" required /></div>
      <div><label className="label">Instructor title</label><input name="instructorTitle" defaultValue={c?.instructorTitle} className="input" /></div>
      <div><label className="label">Price (₹, 0 for free)</label><input name="price" type="number" min="0" step="1" defaultValue={c ? c.priceInPaise / 100 : 0} className="input" /></div>
      <div><label className="label">List price / MRP (₹, shown struck through)</label><input name="mrp" type="number" min="0" step="1" defaultValue={c ? c.mrpInPaise / 100 : 0} className="input" /></div>
      <div><label className="label">Access period in days (0 = lifetime)</label><input name="accessDays" type="number" min="0" defaultValue={c?.accessDays ?? 365} className="input" /></div>
      <div><label className="label">Certificate pass mark (%)</label><input name="passPercent" type="number" min="0" max="100" defaultValue={c?.passPercent ?? 60} className="input" /></div>
      <div><label className="label">Language</label><input name="language" defaultValue={c?.language ?? "English"} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Cover image (optional, 1280×720 recommended)</label><UploadField name="coverImage" defaultValue={c?.coverImage} accept="image/*" placeholder="https://… or upload" /></div>
      <div><label className="label">Cover colour</label><input name="coverColor" type="color" defaultValue={c?.coverColor ?? "#1d4ed8"} className="input h-11 p-1" /></div>
      <div><label className="label">What learners will learn (one per line)</label><textarea name="outcomes" rows={4} defaultValue={c ? parseList(c.outcomes).join("\n") : ""} className="input" /></div>
      <div><label className="label">Requirements (one per line)</label><textarea name="requirements" rows={4} defaultValue={c ? parseList(c.requirements).join("\n") : ""} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Search tags (comma separated)</label><input name="tags" defaultValue={c?.tags} className="input" /></div>
      <div className="flex flex-wrap gap-6 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={c?.published} />Published</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={c?.featured} />Featured on home page</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="certificateEnabled" defaultChecked={c?.certificateEnabled ?? true} />Issue certificate</label>
      </div>
      <div className="sm:col-span-2"><button className="btn-primary">{c ? "Save course" : "Create course"}</button></div>
    </form>
  );
}
