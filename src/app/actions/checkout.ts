"use server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { quote, type ItemType } from "@/lib/pricing";
import { fulfillOrder } from "@/lib/pricing";
import { paymentsEnabled, provider, startCheckout, testPaymentsAllowed } from "@/lib/payments";

export async function previewQuote(type: ItemType, id: string, coupon: string) {
  const user = await requireUser();
  const q = await quote(type, id, coupon, user.id);
  if ("error" in q) return { error: q.error };
  return { amount: q.amount, discount: q.discount, tax: q.tax, total: q.total, coupon: q.coupon?.code ?? null, couponError: q.couponError ?? null };
}

export async function createOrder(type: ItemType, id: string, coupon: string) {
  const user = await requireUser();
  const q = await quote(type, id, coupon, user.id);
  if ("error" in q) return { error: q.error };
  if (q.couponError) return { error: q.couponError };
  if (q.total > 0 && !paymentsEnabled()) return { error: "Online payments are being set up. Please check back soon." };
  const order = await db.order.create({
    data: { userId: user.id, itemType: type, itemId: id, itemTitle: q.item.title, amount: q.amount, discount: q.discount, tax: q.tax, total: q.total, couponCode: q.coupon?.code, provider: provider() },
  });
  if (q.total === 0) {
    await fulfillOrder(order.id, "FREE");
    return { start: { kind: "free" as const, orderId: order.id } };
  }
  try {
    const start = await startCheckout({ orderId: order.id, total: q.total, title: q.item.title, user });
    if (start.providerRef) await db.order.update({ where: { id: order.id }, data: { providerRef: start.providerRef } });
    return { start };
  } catch (e) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return { error: (e as Error).message };
  }
}

/** Test-mode payment: only works when PAYMENT_PROVIDER is "mock". */
export async function completeMockPayment(orderId: string, success: boolean) {
  const user = await requireUser();
  if (provider() !== "mock" || !testPaymentsAllowed()) throw new Error("Test payments are disabled");
  const order = await db.order.findFirstOrThrow({ where: { id: orderId, userId: user.id } });
  if (!success) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return;
  }
  await fulfillOrder(order.id, `mock_${Date.now()}`);
}
