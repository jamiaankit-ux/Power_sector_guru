import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { db } from "./db";
import { getConfig } from "./config";

/**
 * Push notifications through Firebase Cloud Messaging (HTTP v1), which delivers to Android and,
 * once Firebase is added to the iOS project, to iPhone.
 * Set FIREBASE_SERVICE_ACCOUNT to the service-account JSON (or its base64) from Firebase console.
 */
type ServiceAccount = { project_id: string; client_email: string; private_key: string };

async function serviceAccount(): Promise<ServiceAccount | null> {
  const raw = (await getConfig()).firebaseServiceAccount;
  if (!raw) return null;
  try {
    return JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export const pushConfigured = async () => !!(await serviceAccount());

async function accessToken(sa: ServiceAccount) {
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!r.ok) throw new Error("Firebase authentication failed");
  return (await r.json()).access_token as string;
}

export async function sendPush(title: string, body: string, url = "/dashboard", userIds?: string[]) {
  const sa = await serviceAccount();
  if (!sa) throw new Error("Push notifications are not configured (FIREBASE_SERVICE_ACCOUNT).");
  const tokens = await db.pushToken.findMany({ where: userIds ? { userId: { in: userIds } } : {} });
  const token = await accessToken(sa);
  let sent = 0, failed = 0;
  for (const t of tokens) {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: { url } } }),
    });
    if (r.ok) sent++;
    else {
      failed++;
      if (r.status === 404 || r.status === 400) await db.pushToken.delete({ where: { token: t.token } }).catch(() => {});
    }
  }
  return { sent, failed, total: tokens.length };
}
