"use client";
import { useActionState, useState } from "react";
import { KeyRound, Mail, Smartphone } from "lucide-react";
import { confirmOtp, loginWithPassword, requestOtp, type FormState } from "@/app/actions/auth";

export function LoginForm({ next, otp = true }: { next?: string; otp?: boolean }) {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(loginWithPassword, undefined);
  const [otpState, otpAction, otpPending] = useActionState<FormState, FormData>(requestOtp, undefined);
  const [codeState, codeAction, codePending] = useActionState<FormState, FormData>(confirmOtp, undefined);
  const otpStep = codeState?.step === "otp" ? codeState : otpState?.step === "otp" ? otpState : undefined;

  return (
    <div>
      {otp && <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
        {(["password", "otp"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg py-2 transition ${mode === m ? "bg-white shadow dark:bg-slate-950" : "text-slate-500"}`}>
            {m === "password" ? "Password" : "One-time code"}
          </button>
        ))}
      </div>}

      {mode === "password" ? (
        <form action={pwAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="identifier">Email or mobile number</label>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input id="identifier" name="identifier" className="input pl-9" placeholder="you@company.com or 98XXXXXXXX" autoComplete="username" required /></div>
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input id="password" name="password" type="password" className="input pl-9" autoComplete="current-password" required /></div>
          </div>
          {pwState?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{pwState.error}</p>}
          <button className="btn-primary w-full py-3" disabled={pwPending}>{pwPending ? "Signing in…" : "Sign in"}</button>
        </form>
      ) : otpStep ? (
        <form action={codeAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <input type="hidden" name="identifier" value={otpStep.identifier} />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{otpState?.ok}</p>
          {otpState?.devCode && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Test mode (no SMS or email provider configured): your code is <b>{otpState.devCode}</b></p>}
          <div>
            <label className="label" htmlFor="code">6 digit code</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl tracking-[0.5em]" required autoFocus />
          </div>
          {codeState?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{codeState.error}</p>}
          <button className="btn-primary w-full py-3" disabled={codePending}>{codePending ? "Verifying…" : "Verify and sign in"}</button>
        </form>
      ) : (
        <form action={otpAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="identifier2">Email or mobile number</label>
            <div className="relative"><Smartphone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input id="identifier2" name="identifier" className="input pl-9" placeholder="98XXXXXXXX or you@company.com" required /></div>
          </div>
          {otpState?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{otpState.error}</p>}
          <button className="btn-primary w-full py-3" disabled={otpPending}>{otpPending ? "Sending…" : "Send code"}</button>
        </form>
      )}
    </div>
  );
}
