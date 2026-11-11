"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Tag } from "lucide-react";
import { createOrder, previewQuote } from "@/app/actions/checkout";
import { inr } from "@/lib/format";

type Quote = { amount: number; discount: number; tax: number; total: number; coupon: string | null; couponError: string | null };
declare global { interface Window { Razorpay?: new (o: object) => { open(): void } } }

export function CheckoutForm({ type, id, initial, initialCoupon }: { type: "COURSE" | "BUNDLE" | "PLAN"; id: string; initial: Quote; initialCoupon?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCoupon ?? "");
  const [q, setQ] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const apply = () => start(async () => {
    const r = await previewQuote(type, id, code);
    if ("error" in r) setErr(r.error ?? "Error"); else { setQ(r as Quote); setErr(null); }
  });

  const pay = () => start(async () => {
    const r = await createOrder(type, id, q.coupon ?? "");
    if ("error" in r && r.error) return setErr(r.error);
    const s = r.start!;
    if (s.kind === "free") return router.push(`/checkout/result?order=${s.orderId}`);
    if (s.kind === "mock") return router.push(`/checkout/mock?order=${s.orderId}`);
    if (s.kind === "redirect") { window.location.href = s.url; return; }
    if (s.kind === "razorpay") {
      await new Promise<void>((res, rej) => {
        if (window.Razorpay) return res();
        const el = document.createElement("script");
        el.src = "https://checkout.razorpay.com/v1/checkout.js";
        el.onload = () => res(); el.onerror = () => rej();
        document.body.appendChild(el);
      });
      const rzp = new window.Razorpay!({
        key: s.keyId, amount: s.amount, currency: "INR", name: "Power Sector Academy", description: s.name, order_id: s.rzpOrderId,
        prefill: { email: s.email, contact: s.phone }, theme: { color: "#1d4ed8" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: s.orderId, ...resp }) });
          router.push(`/checkout/result?order=${s.orderId}`);
        },
      });
      rzp.open();
    }
  });

  return (
    <div className="card p-6">
      <div className="font-semibold">Order summary</div>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1"><Tag className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input pl-9 uppercase" placeholder="Discount code" /></div>
        <button type="button" onClick={apply} disabled={pending || !code} className="btn-ghost">Apply</button>
      </div>
      {q.couponError && <p className="mt-2 text-sm text-rose-600">{q.couponError}</p>}
      {q.coupon && <p className="mt-2 text-sm text-emerald-600">Code {q.coupon} applied.</p>}
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="muted">Price</dt><dd>{inr(q.amount)}</dd></div>
        {q.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd>−{inr(q.discount)}</dd></div>}
        {q.tax > 0 && <div className="flex justify-between"><dt className="muted">Includes GST</dt><dd className="muted">{inr(q.tax)}</dd></div>}
        <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold dark:border-slate-800"><dt>Total</dt><dd>{q.total === 0 ? "₹0" : inr(q.total)}</dd></div>
      </dl>
      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
      <button onClick={pay} disabled={pending} className="btn-primary mt-6 w-full py-3 text-base"><Lock className="h-4 w-4" />{pending ? "Please wait…" : q.total === 0 ? "Get access" : `Pay ${inr(q.total)}`}</button>
      <p className="muted mt-3 text-center text-xs">UPI, cards, net banking and wallets. Secure payment.</p>
    </div>
  );
}
