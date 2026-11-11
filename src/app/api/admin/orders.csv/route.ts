import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const orders = await db.order.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Order ID", "Date", "Learner", "Email", "Phone", "Item type", "Item", "Price", "Discount", "Coupon", "GST", "Total", "Status", "Provider", "Reference"],
    ...orders.map((o) => [o.id, o.createdAt.toISOString(), o.user.name, o.user.email, o.user.phone, o.itemType, o.itemTitle, o.amount / 100, o.discount / 100, o.couponCode, o.tax / 100, o.total / 100, o.status, o.provider, o.providerRef]),
  ];
  return new Response(rows.map((r) => r.map(esc).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
