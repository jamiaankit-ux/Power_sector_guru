"use client";
import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/actions/auth";

export function ProfileForm({ u }: { u: { name: string; email: string | null; phone: string | null; organization: string | null; designation: string | null; city: string | null } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <div><label className="label">Full name (as it should appear on certificates)</label><input name="name" defaultValue={u.name} className="input" required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Email</label><input value={u.email ?? "–"} className="input opacity-70" disabled /></div>
        <div><label className="label">Mobile</label><input value={u.phone ?? "–"} className="input opacity-70" disabled /></div>
        <div><label className="label">Organisation</label><input name="organization" defaultValue={u.organization ?? ""} className="input" /></div>
        <div><label className="label">Designation</label><input name="designation" defaultValue={u.designation ?? ""} className="input" /></div>
        <div><label className="label">City</label><input name="city" defaultValue={u.city ?? ""} className="input" /></div>
        <div><label className="label">New password</label><input name="password" type="password" placeholder="Leave blank to keep" className="input" /></div>
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>Save changes</button>
    </form>
  );
}
