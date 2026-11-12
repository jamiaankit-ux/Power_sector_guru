import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { otpAvailable } from "@/lib/otp";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next || "/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your email or mobile number.">
      <LoginForm next={next} otp={await otpAvailable()} />
      <p className="muted mt-6 text-center text-sm">New here? <Link className="font-semibold text-brand-600" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
    </AuthShell>
  );
}
