import "server-only";
import { randomBytes } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "./db";

/**
 * File storage for admin uploads (PDFs, slides, images).
 * Uses any S3-compatible bucket when configured (Cloudflare R2, AWS S3, DigitalOcean Spaces):
 *   S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL
 * Otherwise files are kept in the database (fine for a few hundred MB; move to a bucket as you grow).
 */
export const s3Configured = () => !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
export const MAX_DB_FILE = 15 * 1024 * 1024;

export async function storeFile(name: string, contentType: string, data: Buffer) {
  const safe = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  if (s3Configured()) {
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    });
    const key = `uploads/${new Date().toISOString().slice(0, 7)}/${randomBytes(6).toString("hex")}-${safe}`;
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: data, ContentType: contentType }));
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
    return { url: `${base}/${key}`, where: "bucket" as const };
  }
  if (data.length > MAX_DB_FILE) throw new Error("File is larger than 15 MB. Connect a storage bucket (Cloudflare R2) for bigger files.");
  const f = await db.storedFile.create({ data: { name: safe, contentType, size: data.length, data } });
  return { url: `/api/files/${f.id}/${safe}`, where: "database" as const };
}
