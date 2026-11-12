import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = { title: "Reset password" };

export default function ForgotPassword() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll send a one-time code to your email or mobile number.">
      <ResetForm />
      <p className="muted mt-6 text-center text-sm"><Link className="font-semibold text-brand-600" href="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
