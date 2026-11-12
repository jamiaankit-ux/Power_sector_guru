import Link from "next/link";
import { BookOpen, Home, LayoutDashboard, LogOut, Shield, Trophy, User, Award, CreditCard } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { db } from "@/lib/db";
import { getSettings, on } from "@/lib/settings";

export async function Navbar() {
  const [user, s, pages] = await Promise.all([currentUser(), getSettings(), db.page.findMany({ where: { published: true, showInNav: true }, orderBy: { order: "asc" }, select: { slug: true, title: true } })]);
  const isStaff = user && (user.role === "ADMIN" || user.role === "INSTRUCTOR");
  return (
    <>
      {on(s.barEnabled) && s.barText && (
        <div className="no-print bg-brand-900 px-4 py-2 text-center text-sm text-white">
          {s.barText}{s.barLinkUrl && <> <Link href={s.barLinkUrl} className="ml-1 font-semibold text-volt-400 underline">{s.barLinkLabel || "Learn more"}</Link></>}
        </div>
      )}
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="container-x flex h-16 items-center gap-6">
          <Link href="/" aria-label="Home"><Logo name={s.siteName} logoUrl={s.logoUrl} /></Link>
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/courses">Courses</Link>
            <Link className="hide-in-app rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/pricing">Plans & bundles</Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/leaderboard">Leaderboard</Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/verify">Verify certificate</Link>
            {pages.map((p) => <Link key={p.slug} className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href={`/${p.slug}`}>{p.title}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex"><LayoutDashboard className="h-4 w-4" />My learning</Link>
                <details className="relative">
                  <summary className="flex cursor-pointer list-none items-center rounded-full ring-brand-500 focus:ring-2" aria-label="Account menu">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-500 text-sm font-bold text-white">
                      {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </summary>
                  <div className="card absolute right-0 mt-2 w-60 p-2 text-sm shadow-xl">
                    <div className="px-3 py-2">
                      <div className="font-semibold">{user.name}</div>
                      <div className="muted truncate text-xs">{user.email ?? user.phone}</div>
                    </div>
                    <hr className="my-1 border-slate-200 dark:border-slate-800" />
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard/certificates"><Award className="h-4 w-4" />Certificates</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard/orders"><CreditCard className="h-4 w-4" />Purchases</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/profile"><User className="h-4 w-4" />Profile</Link>
                    {isStaff && <Link className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/admin"><Shield className="h-4 w-4" />Admin app</Link>}
                    <form action={logout}>
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Sign out</button>
                    </form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Sign in</Link>
                <Link href="/register" className="btn-primary hidden sm:inline-flex">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {/* App-style bottom tabs on phones */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] text-[11px] font-medium backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        {[
          { href: "/", icon: Home, label: "Home" },
          { href: "/courses", icon: BookOpen, label: "Courses" },
          { href: user ? "/dashboard" : "/login", icon: LayoutDashboard, label: "Learning" },
          { href: user ? "/leaderboard" : "/register", icon: user ? Trophy : User, label: user ? "Ranks" : "Join" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-0.5 py-2 text-slate-600 dark:text-slate-300">
            <Icon className="h-5 w-5" />{label}
          </Link>
        ))}
      </nav>
    </>
  );
}
