import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";

export default async function Result({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: id } = await searchParams;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id, userId: user.id } });
  const ok = order?.status === "PAID";
  let next = "/dashboard";
  if (ok && order.itemType === "COURSE") {
    const c = await db.course.findUnique({ where: { id: order.itemId } });
    if (c) next = `/courses/${c.slug}`;
  }
  return (
    <div className="container-x max-w-md py-16">
      <div className="card p-8 text-center">
        {ok ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : <XCircle className="mx-auto h-14 w-14 text-rose-500" />}
        <h1 className="mt-4 text-2xl font-bold">{ok ? "Payment successful" : order?.status === "PENDING" ? "Payment pending" : "Payment failed"}</h1>
        {order && <p className="muted mt-2">{order.itemTitle} · {inr(order.total)}</p>}
        <p className="muted mt-2 text-sm">{ok ? "Your access is active now. A receipt is available in Purchases." : "No money has been taken for a failed payment. You can try again."}</p>
        <div className="mt-6 grid gap-2">
          {ok ? <Link href={next} className="btn-primary py-3">Start learning</Link> : <Link href="/pricing" className="btn-primary py-3">Try again</Link>}
          {ok && <Link href={`/invoice/${order.id}`} className="btn-ghost">View invoice</Link>}
        </div>
      </div>
    </div>
  );
}
