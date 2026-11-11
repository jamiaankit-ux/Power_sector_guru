import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyStripeSession } from "@/lib/payments";
import { fulfillOrder } from "@/lib/pricing";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const session = url.searchParams.get("session") ?? "";
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order && order.providerRef === session && (await verifyStripeSession(session))) await fulfillOrder(order.id, session);
  return NextResponse.redirect(new URL(`/checkout/result?order=${orderId}`, req.url));
}
