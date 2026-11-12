import Link from "next/link";
import { Linkedin, Mail, MessageCircle, Phone, Youtube, Instagram } from "lucide-react";
import { Logo } from "./Logo";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";

export async function Footer() {
  const [s, pages] = await Promise.all([getSettings(), db.page.findMany({ where: { published: true, showInFooter: true }, orderBy: { order: "asc" }, select: { slug: true, title: true } })]);
  const wa = s.whatsapp.replace(/\D/g, "");
  const social = [[s.linkedin, Linkedin, "LinkedIn"], [s.youtube, Youtube, "YouTube"], [s.instagram, Instagram, "Instagram"]] as const;
  return (
    <footer className="no-print mt-24 border-t border-slate-200 bg-white pb-20 md:pb-0 dark:border-slate-800 dark:bg-slate-950">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo tagline name={s.siteName} taglineText={s.tagline} logoUrl={s.logoUrl} />
          <p className="muted mt-3 text-sm">{s.footerAbout}</p>
          <div className="mt-4 flex gap-2">
            {social.filter(([url]) => url).map(([url, Icon, label]) => (
              <a key={label} href={url} target="_blank" rel="noopener" aria-label={label} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 hover:text-brand-600 dark:bg-slate-800"><Icon className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Learn</div>
          <ul className="muted space-y-2"><li><Link href="/courses">All courses</Link></li><li className="hide-in-app"><Link href="/pricing">Plans & bundles</Link></li><li><Link href="/leaderboard">Leaderboard</Link></li><li><Link href="/verify">Verify a certificate</Link></li></ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Company</div>
          <ul className="muted space-y-2">{pages.map((p) => <li key={p.slug}><Link href={`/${p.slug}`}>{p.title}</Link></li>)}<li><Link href="/terms">Terms of use</Link></li><li><Link href="/privacy">Privacy policy</Link></li><li><Link href="/refunds">Refund policy</Link></li></ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Help and support</div>
          <ul className="muted space-y-2">
            {s.supportEmail && <li><a className="flex items-center gap-2" href={`mailto:${s.supportEmail}`}><Mail className="h-4 w-4" />{s.supportEmail}</a></li>}
            {s.supportPhone && <li><a className="flex items-center gap-2" href={`tel:${s.supportPhone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" />{s.supportPhone}</a></li>}
            {wa && <li><a className="flex items-center gap-2" href={`https://wa.me/${wa}`} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4" />WhatsApp us</a></li>}
            <li className="hide-in-app"><Link href="/install">Install the app</Link></li>
          </ul>
        </div>
      </div>
      <div className="muted border-t border-slate-200 py-6 text-center text-xs dark:border-slate-800">© {new Date().getFullYear()} {s.companyName}. All rights reserved.{s.address && <> · {s.address}</>}{s.gstin && <> · GSTIN {s.gstin}</>}</div>
    </footer>
  );
}
