import { db } from "@/lib/db";

// Serves files stored in the database (used when no storage bucket is connected).
export async function GET(_: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id } = await params;
  const f = await db.storedFile.findUnique({ where: { id } });
  if (!f) return new Response("Not found", { status: 404 });
  const inline = /^(application\/pdf|image\/(png|jpeg|webp|gif))$/.test(f.contentType);
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.contentType,
      "Content-Length": String(f.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${f.name}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
