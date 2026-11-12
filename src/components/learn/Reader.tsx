"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, List, Minus, Plus, Type } from "lucide-react";

type Prefs = { size: number; font: "sans" | "serif"; theme: "auto" | "light" | "sepia" | "dark"; wide: boolean };
const DEF: Prefs = { size: 2, font: "sans", theme: "auto", wide: false };
const SIZES = ["15px", "16px", "18px", "20px", "22px"];
const THEMES: Record<Prefs["theme"], { label: string; cls: string; swatch: string }> = {
  auto: { label: "Auto", cls: "", swatch: "bg-gradient-to-br from-white to-slate-800" },
  light: { label: "Light", cls: "reader-light", swatch: "bg-white" },
  sepia: { label: "Sepia", cls: "reader-sepia", swatch: "bg-[#f4ecd8]" },
  dark: { label: "Dark", cls: "reader-dark", swatch: "bg-[#111827]" },
};

/** Comfortable reading for study material: text size, typeface, paper colour, contents list and a progress bar. */
export function Reader({ html, toc, minutes }: { html: string; toc: { level: number; text: string; id: string }[]; minutes: number }) {
  const [p, setP] = useState<Prefs>(DEF);
  const [open, setOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState("");
  const art = useRef<HTMLElement>(null);

  useEffect(() => { try { setP({ ...DEF, ...JSON.parse(localStorage.getItem("psa-reader") || "{}") }); } catch {} }, []);
  const set = (patch: Partial<Prefs>) => setP((old) => { const n = { ...old, ...patch }; try { localStorage.setItem("psa-reader", JSON.stringify(n)); } catch {} return n; });

  useEffect(() => {
    const onScroll = () => {
      const el = art.current; if (!el) return;
      const r = el.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      setPct(Math.max(0, Math.min(100, total > 0 ? (-r.top / total) * 100 : 100)));
      let cur = "";
      for (const h of el.querySelectorAll("h2[id], h3[id]")) if (h.getBoundingClientRect().top < 120) cur = h.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [html]);

  const chip = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`;
  return (
    <div className="mt-6">
      <div className="fixed inset-x-0 top-0 z-50 h-1"><div className="h-full bg-volt-400 transition-[width]" style={{ width: `${pct}%` }} /></div>
      <div className="relative flex flex-wrap items-center gap-2 text-sm">
        <span className="muted inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{minutes} min read</span>
        <div className="ml-auto flex gap-2">
          {toc.length > 1 && <button onClick={() => { setTocOpen((o) => !o); setOpen(false); }} className="btn-ghost py-1.5 lg:hidden" aria-expanded={tocOpen}><List className="h-4 w-4" />Contents</button>}
          <button onClick={() => { setOpen((o) => !o); setTocOpen(false); }} className="btn-ghost py-1.5" aria-expanded={open} aria-label="Reading settings"><Type className="h-4 w-4" />Aa</button>
        </div>
        {open && (
          <div className="card absolute right-0 top-11 z-30 w-72 space-y-4 p-4 shadow-xl">
            <div><div className="muted mb-1.5 text-xs font-semibold uppercase">Text size</div>
              <div className="flex items-center gap-2"><button className={chip(false)} onClick={() => set({ size: Math.max(0, p.size - 1) })} aria-label="Smaller"><Minus className="h-4 w-4" /></button><div className="flex-1 text-center font-medium">{SIZES[p.size]}</div><button className={chip(false)} onClick={() => set({ size: Math.min(SIZES.length - 1, p.size + 1) })} aria-label="Larger"><Plus className="h-4 w-4" /></button></div></div>
            <div><div className="muted mb-1.5 text-xs font-semibold uppercase">Typeface</div>
              <div className="flex gap-2"><button className={chip(p.font === "sans")} onClick={() => set({ font: "sans" })}>Sans</button><button className={`${chip(p.font === "serif")} font-serif`} onClick={() => set({ font: "serif" })}>Serif</button></div></div>
            <div><div className="muted mb-1.5 text-xs font-semibold uppercase">Page colour</div>
              <div className="flex gap-2">{(Object.keys(THEMES) as Prefs["theme"][]).map((k) => <button key={k} onClick={() => set({ theme: k })} className="flex flex-col items-center gap-1 text-xs"><span className={`h-9 w-9 rounded-full border-2 ${THEMES[k].swatch} ${p.theme === k ? "border-brand-600" : "border-slate-300 dark:border-slate-600"}`} />{THEMES[k].label}</button>)}</div></div>
            <div><div className="muted mb-1.5 text-xs font-semibold uppercase">Line width</div>
              <div className="flex gap-2"><button className={chip(!p.wide)} onClick={() => set({ wide: false })}>Comfortable</button><button className={chip(p.wide)} onClick={() => set({ wide: true })}>Wide</button></div></div>
          </div>
        )}
        {tocOpen && <nav className="card absolute right-0 top-11 z-30 max-h-80 w-72 overflow-y-auto p-3 shadow-xl lg:hidden">{toc.map((h) => <a key={h.id} href={`#${h.id}`} onClick={() => setTocOpen(false)} className={`block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${h.level === 3 ? "pl-5" : "font-medium"}`}>{h.text}</a>)}</nav>}
      </div>

      <div className="mt-4 gap-8 lg:grid lg:grid-cols-[1fr_220px]">
        <div className={`reader-page rounded-2xl ${THEMES[p.theme].cls} ${p.theme === "auto" ? "" : "px-5 py-6 sm:px-8"}`}>
          <article ref={art} className={`prose-pa reading ${p.font === "serif" ? "reading-serif" : ""} ${p.wide ? "max-w-none" : "max-w-[68ch]"}`} style={{ fontSize: SIZES[p.size] }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        {toc.length > 1 && (
          <nav className="hidden lg:block"><div className="sticky top-24 max-h-[70vh] overflow-y-auto border-l border-slate-200 pl-4 text-sm dark:border-slate-800">
            <div className="muted mb-2 text-xs font-bold uppercase tracking-wider">In this lesson</div>
            {toc.map((h) => <a key={h.id} href={`#${h.id}`} className={`block py-1 ${h.level === 3 ? "pl-3" : ""} ${active === h.id ? "font-semibold text-brand-600 dark:text-volt-400" : "muted hover:text-slate-900 dark:hover:text-white"}`}>{h.text}</a>)}
          </div></nav>
        )}
      </div>
    </div>
  );
}
