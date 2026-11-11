import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").slice(0, 4096);
  const platform = ["android", "ios", "web"].includes(body.platform) ? body.platform : "android";
  if (token.length < 20) return NextResponse.json({ error: "bad token" }, { status: 400 });
  const user = await currentUser();
  await db.pushToken.upsert({ where: { token }, update: { userId: user?.id ?? null, platform }, create: { token, userId: user?.id ?? null, platform } });
  return NextResponse.json({ ok: true });
}
