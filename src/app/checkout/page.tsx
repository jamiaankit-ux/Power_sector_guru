import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { quote, type ItemType } from "@/lib/pricing";
import { inr } from "@/lib/format";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function Checkout({ searchParams }: { searchParams: Promise<{ type?: string; id?: string; coupon?: string }> }) {
  const sp = await searchParams;
  const type = (sp.type ?? "COURSE").toUpperCase() as ItemType;
  if (!["COURSE", "BUNDLE", "PLAN"].includes(type) || !sp.id) notFound();
  const user = await requireUser(`/checkout?type=${type}&id=${sp.id}`);
  const q = await quote(type, sp.id, sp.coupon, user.id);
  if ("error" in q) notFound();
  const includes =
    type === "BUNDLE" ? (await db.bundleCourse.findMany({ where: { bundleId: sp.id }, include: { course: true } })).map((b) => b.course.title)
    : type === "PLAN" ? ["Every published course", "All future courses", "Certificates on completion"]
    : ["Full course access", "Study material and quizzes", "Certificate on completion"];
  return (
    <div className="container-x grid max-w-5xl gap-8 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <Link href="/pricing" className="muted text-sm">← Back</Link>
        <h1 className="h-section mt-2">Checkout</h1>
        <div className="card mt-6 p-6">
          <div className="muted text-xs font-semibold uppercase tracking-wider">{type.toLowerCase()}</div>
          <div className="mt-1 text-xl font-bold">{q.item.title}</div>
          {q.item.mrp > q.item.price && <div className="muted mt-1 text-sm">List price <span className="line-through">{inr(q.item.mrp)}</span></div>}
          <ul className="mt-4 space-y-2 text-sm">{includes.map((i) => <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{i}</li>)}</ul>
        </div>
        <div className="muted mt-4 text-sm">Billing to <b>{user.name}</b> · {user.email ?? user.phone}</div>
      </div>
      <CheckoutForm type={type} id={sp.id} initialCoupon={sp.coupon}
        initial={{ amount: q.amount, discount: q.discount, tax: q.tax, total: q.total, coupon: q.coupon?.code ?? null, couponError: q.couponError ?? null }} />
    </div>
  );
}
