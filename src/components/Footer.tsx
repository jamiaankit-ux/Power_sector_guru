import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-slate-200 bg-white pb-20 md:pb-0 dark:border-slate-800 dark:bg-slate-950">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="muted mt-3 text-sm">Industry-grade learning for engineers and professionals across generation, transmission, distribution, markets and regulation.</p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Learn</div>
          <ul className="muted space-y-2"><li><Link href="/courses">All courses</Link></li><li><Link href="/pricing">Plans & bundles</Link></li><li><Link href="/leaderboard">Leaderboard</Link></li></ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Account</div>
          <ul className="muted space-y-2"><li><Link href="/dashboard">My learning</Link></li><li><Link href="/dashboard/certificates">Certificates</Link></li><li><Link href="/verify">Verify a certificate</Link></li></ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Get the app</div>
          <p className="muted">Install on Android, iPhone, Windows or Mac from your browser menu: choose “Install app” or “Add to Home Screen”.</p>
        </div>
      </div>
      <div className="muted border-t border-slate-200 py-6 text-center text-xs dark:border-slate-800">© {new Date().getFullYear()} Power Academy. All rights reserved.</div>
    </footer>
  );
}
