import "server-only";
import { db } from "./db";

/** Records an admin action for the audit log. Never throws. */
export async function audit(user: { id: string; name: string } | null, action: string, details = "") {
  try {
    await db.auditLog.create({ data: { userId: user?.id ?? null, userName: user?.name ?? "system", action, details: details.slice(0, 2000) } });
  } catch {}
}
