import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { completeMockPayment } from "@/app/actions/checkout";
import { testPaymentsAllowed } from "@/lib/payments";

export default async function MockPay({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: id } = await searchParams;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id, userId: user.id } });
  if (!order || !(await testPaymentsAllowed())) redirect("/pricing");
  async function pay(fd: FormData) {
    "use server";
    await completeMockPayment(String(fd.get("id")), fd.get("ok") === "1");
    redirect(`/checkout/result?order=${fd.get("id")}`);
  }
  return (
    <div className="container-x max-w-md py-16">
      <div className="card p-8 text-center">
        <FlaskConical className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-xl font-bold">Test payment</h1>
        <p className="muted mt-2 text-sm">No payment gateway is connected yet, so this screen simulates one. Add Razorpay or Stripe keys to take real payments.</p>
        <div className="mt-6 text-3xl font-extrabold">{inr(order.total)}</div>
        <div className="muted text-sm">{order.itemTitle}</div>
        <form action={pay} className="mt-6 grid gap-2">
          <input type="hidden" name="id" value={order.id} /><input type="hidden" name="ok" value="1" />
          <button className="btn-primary py-3">Simulate successful payment</button>
        </form>
        <form action={pay} className="mt-2 grid">
          <input type="hidden" name="id" value={order.id} /><input type="hidden" name="ok" value="0" />
          <button className="btn-ghost">Simulate failure</button>
        </form>
      </div>
    </div>
  );
}
