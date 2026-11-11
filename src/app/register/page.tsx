import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create account" };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Create your account" subtitle="Free courses are available right after you sign up.">
      <RegisterForm next={next} />
      <p className="muted mt-6 text-center text-sm">Already registered? <Link className="font-semibold text-brand-600" href="/login">Sign in</Link></p>
    </AuthShell>
  );
}
