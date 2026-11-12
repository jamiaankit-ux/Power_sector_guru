import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { s3Configured } from "@/lib/storage";
import { bunnyConfigured, startBucketUpload, startBunnyUpload } from "@/lib/video";

// Step 1 of a direct video upload: returns where the browser should send the file.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "INSTRUCTOR")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "video").slice(0, 200), type = String(b.type ?? ""), size = Number(b.size) || 0;
  if (!type.startsWith("video/")) return NextResponse.json({ error: "Choose a video file (MP4, MOV, MKV, WebM)." }, { status: 400 });
  try {
    if (await bunnyConfigured()) {
      const u = await startBunnyUpload(name.replace(/\.[^.]+$/, ""));
      await db.media.create({ data: { name, url: u.url, contentType: type, size, kind: "VIDEO", store: "bunny", ref: u.videoId } });
      await audit(user, "video.upload", `${name} → Bunny Stream`);
      return NextResponse.json(u);
    }
    if (await s3Configured()) {
      const u = await startBucketUpload(name, type);
      await db.media.create({ data: { name, url: u.url, contentType: type, size, kind: "VIDEO", store: "bucket", ref: u.key } });
      await audit(user, "video.upload", `${name} → bucket`);
      return NextResponse.json(u);
    }
    return NextResponse.json({ error: "Connect video hosting first: Admin → Payments and integrations → Video hosting (Bunny Stream). Until then, paste a video link instead." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
