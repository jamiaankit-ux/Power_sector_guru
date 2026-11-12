import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { verifyRazorpay } from "@/lib/payments";
import { fulfillOrder } from "@/lib/pricing";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const b = await req.json();
  const order = await db.order.findFirst({ where: { id: b.orderId, userId: user.id } });
  if (!order || order.providerRef !== b.razorpay_order_id) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await verifyRazorpay(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature))) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await fulfillOrder(order.id, b.razorpay_payment_id);
  return NextResponse.json({ ok: true });
}
