"use client";
import { useActionState } from "react";
import { requestReset, resetPassword, type FormState } from "@/app/actions/auth";
import { keepValues } from "./keepValues";

const err = (m?: string) => m && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{m}</p>;

export function ResetForm() {
  const [reqState, reqAction, reqPending] = useActionState<FormState, FormData>(requestReset, undefined);
  const [resState, resAction, resPending] = useActionState<FormState, FormData>(resetPassword, undefined);
  const step = resState?.step === "otp" ? resState : reqState?.step === "otp" ? reqState : undefined;
  if (!step)
    return (
      <form action={reqAction} className="space-y-4">
        <div><label className="label" htmlFor="identifier">Email or mobile number</label><input id="identifier" name="identifier" className="input" placeholder="you@company.com or 98XXXXXXXX" required /></div>
        {err(reqState?.error)}
        <button className="btn-primary w-full py-3" disabled={reqPending}>{reqPending ? "Sending…" : "Send reset code"}</button>
      </form>
    );
  return (
    <form onSubmit={keepValues(resAction)} className="space-y-4">
      <input type="hidden" name="identifier" value={step.identifier} />
      <p className="text-sm text-emerald-700 dark:text-emerald-400">{reqState?.ok}</p>
      {reqState?.devCode && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Test mode: your code is <b>{reqState.devCode}</b></p>}
      <div><label className="label" htmlFor="code">6 digit code</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl tracking-[0.5em]" required autoFocus /></div>
      <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} /><p className="muted mt-1 text-xs">At least 8 characters with letters and numbers.</p></div>
      {err(resState?.error)}
      <button className="btn-primary w-full py-3" disabled={resPending}>{resPending ? "Saving…" : "Set new password and sign in"}</button>
    </form>
  );
}
