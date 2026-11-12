import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { storeFile } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

const ALLOWED = /^(application\/pdf|image\/(png|jpeg|webp|gif|svg\+xml)|application\/vnd\.(ms-powerpoint|openxmlformats-officedocument\.(presentationml|spreadsheetml|wordprocessingml)\.[a-z.]+|ms-excel)|application\/msword|text\/(csv|plain)|application\/zip)$/;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "INSTRUCTOR")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  if (!ALLOWED.test(file.type)) return NextResponse.json({ error: "Upload PDF, slides, documents, spreadsheets or images. For videos use your video host." }, { status: 400 });
  try {
    const r = await storeFile(file.name, file.type, Buffer.from(await file.arrayBuffer()));
    await audit(user, "file.upload", `${file.name} (${Math.round(file.size / 1024)} KB) → ${r.where}`);
    await db.media.create({ data: { name: file.name, url: r.url, contentType: file.type, size: file.size, kind: file.type.startsWith("image/") ? "IMAGE" : "FILE", store: r.where, ref: r.ref } });
    return NextResponse.json({ url: r.url, where: r.where });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
