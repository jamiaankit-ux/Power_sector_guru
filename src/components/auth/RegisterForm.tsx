"use client";
import { useActionState } from "react";
import { register, type FormState } from "@/app/actions/auth";
import { keepValues } from "./keepValues";

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, undefined);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" className="input" autoComplete="name" required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" placeholder="you@company.com" /></div>
        <div><label className="label" htmlFor="phone">Mobile number</label>
          <div className="flex"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">+91</span>
            <input id="phone" name="phone" inputMode="tel" className="input rounded-l-none" autoComplete="tel-national" placeholder="98XXXXXXXX" /></div></div>
      </div>
      <p className="muted -mt-2 text-xs">Add at least one. You can sign in with either.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="organization">Organisation <span className="muted font-normal">(optional)</span></label><input id="organization" name="organization" className="input" placeholder="e.g. NTPC, SLDC, discom" /></div>
        <div><label className="label" htmlFor="designation">Designation <span className="muted font-normal">(optional)</span></label><input id="designation" name="designation" className="input" placeholder="e.g. Assistant Engineer" /></div>
      </div>
      <div><label className="label" htmlFor="password">Create password</label><input id="password" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required /><p className="muted mt-1 text-xs">At least 8 characters with letters and numbers.</p></div>
      {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "Creating account…" : "Create free account"}</button>
      <p className="muted text-center text-xs">By registering you agree to the <a className="underline" href="/terms" target="_blank">Terms of Use</a> and <a className="underline" href="/privacy" target="_blank">Privacy Policy</a>.</p>
    </form>
  );
}
