import "server-only";
import { randomBytes } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "./db";
import { getConfig } from "./config";

/**
 * File storage for admin uploads (PDFs, slides, images).
 * Uses any S3-compatible bucket when configured (Cloudflare R2, AWS S3, DigitalOcean Spaces):
 *   S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL
 * Otherwise files are kept in the database (fine for a few hundred MB; move to a bucket as you grow).
 */
export const s3Configured = async () => { const c = await getConfig(); return !!(c.s3Bucket && c.s3AccessKeyId && c.s3SecretAccessKey); };
export async function s3Client() {
  const c = await getConfig();
  return new S3Client({ region: c.s3Region || "auto", endpoint: c.s3Endpoint || undefined, credentials: { accessKeyId: c.s3AccessKeyId, secretAccessKey: c.s3SecretAccessKey } });
}
export const MAX_DB_FILE = 15 * 1024 * 1024;

export async function storeFile(name: string, contentType: string, data: Buffer) {
  const safe = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  if (await s3Configured()) {
    const c = await getConfig();
    const key = `uploads/${new Date().toISOString().slice(0, 7)}/${randomBytes(6).toString("hex")}-${safe}`;
    await (await s3Client()).send(new PutObjectCommand({ Bucket: c.s3Bucket, Key: key, Body: data, ContentType: contentType }));
    return { url: `${c.s3PublicUrl.replace(/\/$/, "")}/${key}`, where: "bucket" as const, ref: key };
  }
  if (data.length > MAX_DB_FILE) throw new Error("File is larger than 15 MB. Connect a storage bucket (Cloudflare R2) for bigger files.");
  const f = await db.storedFile.create({ data: { name: safe, contentType, size: data.length, data } });
  return { url: `/api/files/${f.id}/${safe}`, where: "database" as const, ref: f.id };
}
