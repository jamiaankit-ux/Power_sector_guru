// Small building blocks for admin forms.
export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      {hint && <p className="muted mt-0.5 text-sm">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ name, label, value, wide, hint, placeholder, type = "text" }: { name: string; label: string; value?: string; wide?: boolean; hint?: string; placeholder?: string; type?: string }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={value} placeholder={placeholder} className="input" />
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function Area({ name, label, value, rows = 3, hint, mono }: { name: string; label: string; value?: string; rows?: number; hint?: string; mono?: boolean }) {
  return (
    <div className="sm:col-span-2">
      <label className="label" htmlFor={name}>{label}</label>
      <textarea id={name} name={name} rows={rows} defaultValue={value} className={`input ${mono ? "font-mono text-[13px]" : ""}`} />
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/** Checkbox for an on/off setting. The hidden marker tells the save action this switch was on the form. */
export function Toggle({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 sm:col-span-2">
      <input type="hidden" name="__bools" value={name} />
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-4 w-4" />
      <span><span className="text-sm font-medium">{label}</span>{hint && <span className="muted block text-xs">{hint}</span>}</span>
    </label>
  );
}

export function Saved({ show, text = "Saved. The website is updated." }: { show?: string; text?: string }) {
  return show ? <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{text}</p> : null;
}

export function SaveBar({ back, label = "Save changes", preview }: { back: string; label?: string; preview?: string }) {
  return (
    <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4 dark:border-slate-800 dark:bg-slate-900/95">
      <input type="hidden" name="__back" value={back} />
      <button className="btn-primary">{label}</button>
      {preview && <a href={preview} target="_blank" className="btn-ghost">Preview</a>}
      <span className="muted hidden text-xs sm:inline">Changes go live as soon as you save.</span>
    </div>
  );
}

export function PageHead({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{text && <p className="muted mt-1 max-w-2xl text-sm">{text}</p>}</div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
