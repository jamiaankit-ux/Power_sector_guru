import "server-only";
import { createHmac } from "crypto";

/**
 * Pluggable payment gateway. Set PAYMENT_PROVIDER to "razorpay" or "stripe"
 * and add the keys in .env. "mock" simulates a successful payment so the
 * whole purchase flow can be tested before a gateway is connected.
 */
export type CheckoutStart =
  | { kind: "mock"; orderId: string }
  | { kind: "razorpay"; orderId: string; keyId: string; rzpOrderId: string; amount: number; name: string; email?: string; phone?: string }
  | { kind: "redirect"; url: string };

export const provider = () => (process.env.PAYMENT_PROVIDER || "mock") as "mock" | "razorpay" | "stripe";

/** Test payments let anyone unlock paid content, so they are off on a live site unless explicitly allowed. */
export const testPaymentsAllowed = () =>
  process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true";

/** True when the site can take money (a real gateway is configured) or test payments are allowed. */
export const paymentsEnabled = () => provider() !== "mock" || testPaymentsAllowed();

export async function startCheckout(o: {
  orderId: string;
  total: number;
  title: string;
  user: { name: string; email: string | null; phone: string | null };
}): Promise<CheckoutStart & { providerRef?: string }> {
  const p = provider();
  if (p === "razorpay") {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: o.total, currency: "INR", receipt: o.orderId, notes: { title: o.title } }),
    });
    if (!r.ok) throw new Error("Could not start Razorpay payment");
    const j = await r.json();
    return {
      kind: "razorpay",
      orderId: o.orderId,
      keyId: process.env.RAZORPAY_KEY_ID!,
      rzpOrderId: j.id,
      amount: o.total,
      name: o.title,
      email: o.user.email ?? undefined,
      phone: o.user.phone ?? undefined,
      providerRef: j.id,
    };
  }
  if (p === "stripe") {
    const base = process.env.APP_URL || "http://localhost:3000";
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": "inr",
      "line_items[0][price_data][product_data][name]": o.title,
      "line_items[0][price_data][unit_amount]": String(o.total),
      "line_items[0][quantity]": "1",
      client_reference_id: o.orderId,
      success_url: `${base}/api/payments/stripe/return?order=${o.orderId}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/result?order=${o.orderId}&status=cancelled`,
    });
    if (o.user.email) body.set("customer_email", o.user.email);
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      body,
    });
    if (!r.ok) throw new Error("Could not start Stripe payment");
    const j = await r.json();
    return { kind: "redirect", url: j.url, providerRef: j.id };
  }
  return { kind: "mock", orderId: o.orderId };
}

export function verifyRazorpay(rzpOrderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${rzpOrderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function verifyStripeSession(sessionId: string) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!r.ok) return false;
  const j = await r.json();
  return j.payment_status === "paid";
}
