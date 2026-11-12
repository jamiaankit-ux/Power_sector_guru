import "server-only";
import { createHash, randomBytes } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig } from "./config";
import { s3Client, s3Configured } from "./storage";

/**
 * Direct browser uploads for big files, so videos never pass through (or time out on) the web server.
 *  - Bunny Stream: resumable upload; Bunny encodes every quality and serves HLS.
 *  - S3 / Cloudflare R2: a presigned PUT link; the file is served as it was uploaded (MP4).
 */
export const bunnyConfigured = async () => { const c = await getConfig(); return !!(c.bunnyLibraryId && c.bunnyApiKey && c.bunnyCdnHost); };

const host = (h: string) => h.replace(/^https?:\/\//, "").replace(/\/$/, "");

export async function startBunnyUpload(title: string) {
  const c = await getConfig();
  const r = await fetch(`https://video.bunnycdn.com/library/${c.bunnyLibraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: c.bunnyApiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error("Bunny Stream refused the upload. Check the library ID and API key in Integrations.");
  const videoId = String((await r.json()).guid);
  const expire = Math.floor(Date.now() / 1000) + 6 * 3600;
  const signature = createHash("sha256").update(c.bunnyLibraryId + c.bunnyApiKey + expire + videoId).digest("hex");
  return {
    kind: "bunny" as const, endpoint: "https://video.bunnycdn.com/tusupload", videoId, libraryId: c.bunnyLibraryId, expire, signature,
    url: `https://${host(c.bunnyCdnHost)}/${videoId}/playlist.m3u8`, poster: `https://${host(c.bunnyCdnHost)}/${videoId}/thumbnail.jpg`,
  };
}

export async function startBucketUpload(name: string, contentType: string) {
  const c = await getConfig();
  const safe = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  const key = `media/${new Date().toISOString().slice(0, 7)}/${randomBytes(6).toString("hex")}-${safe}`;
  const putUrl = await getSignedUrl(await s3Client(), new PutObjectCommand({ Bucket: c.s3Bucket, Key: key, ContentType: contentType }), { expiresIn: 6 * 3600 });
  return { kind: "bucket" as const, putUrl, key, url: `${c.s3PublicUrl.replace(/\/$/, "")}/${key}` };
}

export async function deleteRemote(store: string, ref: string | null) {
  if (!ref) return;
  const c = await getConfig();
  if (store === "bunny" && c.bunnyApiKey) await fetch(`https://video.bunnycdn.com/library/${c.bunnyLibraryId}/videos/${ref}`, { method: "DELETE", headers: { AccessKey: c.bunnyApiKey } }).catch(() => {});
  if (store === "bucket" && (await s3Configured())) await (await s3Client()).send(new DeleteObjectCommand({ Bucket: c.s3Bucket, Key: ref })).catch(() => {});
}
