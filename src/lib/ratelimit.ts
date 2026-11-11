import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limiter stored in the database (works across server restarts and instances).
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || now.getTime() - row.windowStart.getTime() > windowSec * 1000) {
    await db.rateLimit.upsert({ where: { key }, update: { count: 1, windowStart: now }, create: { key, count: 1, windowStart: now } });
    return true;
  }
  if (row.count >= limit) return false;
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}
