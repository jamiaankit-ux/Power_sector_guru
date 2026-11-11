import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const orders = await db.order.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  return csvResponse("orders", [
    ["Order ID", "Date", "Learner", "Email", "Phone", "Item type", "Item", "Price", "Discount", "Coupon", "GST", "Total", "Status", "Provider", "Reference"],
    ...orders.map((o) => [o.id, o.createdAt.toISOString(), o.user.name, o.user.email, o.user.phone, o.itemType, o.itemTitle, o.amount / 100, o.discount / 100, o.couponCode, o.tax / 100, o.total / 100, o.status, o.provider, o.providerRef]),
  ]);
}
