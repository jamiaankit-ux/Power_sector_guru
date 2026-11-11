import Link from "next/link";
import { Award, BarChart3, Bell, BookOpen, CreditCard, History, Megaphone, MessageSquare, Package, Settings, Sparkles, Tag, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

const nav = [
  ["/admin", BarChart3, "Overview", true], ["/admin/courses", BookOpen, "Courses", false], ["/admin/pricing", Package, "Plans & bundles", true],
  ["/admin/coupons", Tag, "Discount codes", true], ["/admin/orders", CreditCard, "Orders", true], ["/admin/users", Users, "Learners", true],
  ["/admin/certificates", Award, "Certificates", true], ["/admin/discussions", MessageSquare, "Doubts", false], ["/admin/tutor", Sparkles, "AI assistant", true],
  ["/admin/announcements", Megaphone, "Announcements", true], ["/admin/notifications", Bell, "Push notifications", true],
  ["/admin/settings", Settings, "Settings", true], ["/admin/audit", History, "Activity log", true],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const items = nav.filter(([, , , adminOnly]) => me.role === "ADMIN" || !adminOnly);
  return (
    <div className="container-x grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="muted mb-2 px-3 text-xs font-bold uppercase tracking-wider">{me.role === "ADMIN" ? "Admin console" : "Instructor"}</div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {items.map(([href, Icon, label]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white dark:hover:bg-slate-900"><Icon className="h-4 w-4" />{label}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
