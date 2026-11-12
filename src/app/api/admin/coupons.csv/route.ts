import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const q = new URL(req.url).searchParams.get("q");
  const coupons = await db.coupon.findMany({ where: q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}, orderBy: { createdAt: "desc" } });
  return csvResponse("discount-codes", [
    ["Code", "Note", "Type", "Value", "Applies to", "Used", "Max uses", "Valid from", "Valid until", "Active"],
    ...coupons.map((c) => [c.code, c.description, c.kind, c.kind === "FLAT" ? c.value / 100 : `${c.value}%`, c.appliesTo, c.redeemed, c.maxRedemptions || "unlimited", c.validFrom?.toISOString().slice(0, 10), c.validTo?.toISOString().slice(0, 10), c.active ? "yes" : "no"]),
  ]);
}
