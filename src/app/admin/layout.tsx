import Link from "next/link";
import { BarChart3, BookOpen, CreditCard, Megaphone, MessageSquare, Package, Tag, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

const nav = [
  ["/admin", BarChart3, "Overview"], ["/admin/courses", BookOpen, "Courses"], ["/admin/pricing", Package, "Plans & bundles"],
  ["/admin/coupons", Tag, "Discount codes"], ["/admin/orders", CreditCard, "Orders"], ["/admin/users", Users, "Learners"],
  ["/admin/discussions", MessageSquare, "Doubts"], ["/admin/announcements", Megaphone, "Announcements"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-x grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="muted mb-2 px-3 text-xs font-bold uppercase tracking-wider">Admin</div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map(([href, Icon, label]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white dark:hover:bg-slate-900"><Icon className="h-4 w-4" />{label}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
