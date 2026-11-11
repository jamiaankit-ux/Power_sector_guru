import "server-only";
import { db } from "./db";

export type ItemType = "COURSE" | "BUNDLE" | "PLAN";

export async function loadItem(type: ItemType, id: string) {
  if (type === "COURSE") {
    const c = await db.course.findUnique({ where: { id } });
    return c && { id: c.id, title: c.title, price: c.priceInPaise, mrp: c.mrpInPaise, accessDays: c.accessDays };
  }
  if (type === "BUNDLE") {
    const b = await db.bundle.findUnique({ where: { id } });
    return b && { id: b.id, title: b.title, price: b.priceInPaise, mrp: b.mrpInPaise, accessDays: b.accessDays };
  }
  const p = await db.plan.findUnique({ where: { id } });
  return p && { id: p.id, title: `${p.name} plan`, price: p.priceInPaise, mrp: 0, accessDays: 0 };
}

/**
 * Prices are GST-inclusive. The tax line is the GST component contained in
 * the final total, shown for invoices.
 */
export async function quote(type: ItemType, id: string, couponCode: string | undefined, userId?: string) {
  const item = await loadItem(type, id);
  if (!item) return { error: "Item not found" as const };
  let discount = 0;
  let couponError: string | undefined;
  let coupon = null;
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    coupon = await db.coupon.findUnique({ where: { code } });
    const now = new Date();
    if (!coupon || !coupon.active) couponError = "This code is not valid.";
    else if (coupon.validFrom && coupon.validFrom > now) couponError = "This code is not active yet.";
    else if (coupon.validTo && coupon.validTo < now) couponError = "This code has expired.";
    else if (coupon.maxRedemptions && coupon.redeemed >= coupon.maxRedemptions) couponError = "This code has been fully used.";
    else if (coupon.appliesTo !== "ALL" && coupon.appliesTo !== type) couponError = `This code only applies to ${coupon.appliesTo.toLowerCase()}s.`;
    else if (coupon.targetId && coupon.targetId !== id) couponError = "This code does not apply to this item.";
    else if (coupon.minOrder && item.price < coupon.minOrder) couponError = "Order value is below the minimum for this code.";
    else if (userId && coupon.perUserLimit) {
      const used = await db.order.count({ where: { userId, couponCode: code, status: "PAID" } });
      if (used >= coupon.perUserLimit) couponError = "You have already used this code.";
    }
    if (!couponError && coupon) {
      discount =
        coupon.kind === "PERCENT"
          ? Math.round((item.price * coupon.value) / 100)
          : coupon.value;
      if (coupon.kind === "PERCENT" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(discount, item.price);
    } else coupon = null;
  }
  const total = item.price - discount;
  const rate = Number(process.env.TAX_PERCENT || 0) / 100;
  const tax = Math.round(total - total / (1 + rate));
  return { item, amount: item.price, discount, tax, total, coupon, couponError };
}

/** Grants access after a successful payment. Safe to call more than once. */
export async function fulfillOrder(orderId: string, providerRef?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status === "PAID") return order;
  const paid = await db.order.update({
    where: { id: orderId },
    data: { status: "PAID", paidAt: new Date(), providerRef: providerRef ?? order.providerRef },
  });
  if (order.couponCode) await db.coupon.update({ where: { code: order.couponCode }, data: { redeemed: { increment: 1 } } }).catch(() => {});
  const grant = async (courseId: string, days: number, source: string) => {
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86400_000) : null;
    await db.enrollment.upsert({
      where: { userId_courseId: { userId: order.userId, courseId } },
      update: { source, expiresAt },
      create: { userId: order.userId, courseId, source, expiresAt },
    });
  };
  if (order.itemType === "COURSE") {
    const c = await db.course.findUniqueOrThrow({ where: { id: order.itemId } });
    await grant(c.id, c.accessDays, "PURCHASE");
  } else if (order.itemType === "BUNDLE") {
    const b = await db.bundle.findUniqueOrThrow({ where: { id: order.itemId }, include: { courses: true } });
    for (const bc of b.courses) await grant(bc.courseId, b.accessDays, "BUNDLE");
  } else {
    const p = await db.plan.findUniqueOrThrow({ where: { id: order.itemId } });
    const months = p.interval === "MONTH" ? 1 : p.interval === "QUARTER" ? 3 : 12;
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    await db.subscription.create({ data: { userId: order.userId, planId: p.id, currentPeriodEnd: end } });
  }
  return paid;
}
