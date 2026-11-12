"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award, BarChart3, Bell, BookOpen, CreditCard, ExternalLink, FileText, History, Home, Image as ImageIcon, LayoutDashboard, LogOut, Megaphone, Menu,
  MessageSquare, Package, Palette, Plug, Settings, Sparkles, Tag, Users, X,
} from "lucide-react";

const icons = { BarChart3, BookOpen, Package, Tag, ImageIcon, Users, Award, MessageSquare, Sparkles, CreditCard, Home, LayoutDashboard, FileText, Palette, Megaphone, Bell, Plug, Settings, History };
export type NavItem = { href: string; icon: keyof typeof icons; label: string };
export type NavGroup = { title: string; items: NavItem[] };

export function AdminShell({ groups, user, siteName, logout, children }: { groups: NavGroup[]; user: { name: string; role: string }; siteName: string; logout: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const all = groups.flatMap((g) => g.items);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const current = [...all].sort((a, b) => b.href.length - a.href.length).find((i) => active(i.href));
  const quick = all.filter((i) => ["/admin", "/admin/courses", "/admin/orders", "/admin/users"].includes(i.href));

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</div>
          {g.items.map((i) => {
            const Icon = icons[i.icon];
            const on = active(i.href);
            return (
              <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${on ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                <Icon className={`h-4 w-4 ${on ? "text-volt-400" : ""}`} />{i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
  const brand = (
    <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5 text-white">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden><rect width="32" height="32" rx="9" fill="#1d4ed8" /><path d="M18 4 8 18h7l-2 10 11-15h-7l1-9z" fill="#fbbf24" /></svg>
      <div className="leading-tight"><div className="text-sm font-bold">{siteName}</div><div className="text-[11px] text-slate-400">{user.role === "ADMIN" ? "Admin app" : "Instructor app"}</div></div>
    </div>
  );
  const foot = (
    <div className="border-t border-white/10 p-3 text-sm">
      <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white"><ExternalLink className="h-4 w-4" />View website</Link>
      <form action={logout}><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0a0f1c]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 lg:flex">{brand}{nav}{foot}</aside>

      {/* Phone drawer */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-brand-900 transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
        {brand}{nav}{foot}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-950/90" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="font-semibold">{current?.label ?? "Admin"}</div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 sm:flex dark:border-slate-700 dark:hover:bg-slate-800"><ExternalLink className="h-3.5 w-3.5" />View website</Link>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-500 text-xs font-bold text-white" title={user.name}>{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* Phone bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] text-[11px] font-medium backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95" style={{ gridTemplateColumns: `repeat(${quick.length + 1}, minmax(0, 1fr))` }}>
        {quick.map((i) => { const Icon = icons[i.icon]; return <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 ${active(i.href) ? "text-brand-600 dark:text-volt-400" : "text-slate-500"}`}><Icon className="h-5 w-5" />{i.label}</Link>; })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-slate-500"><Menu className="h-5 w-5" />More</button>
      </nav>
    </div>
  );
}
