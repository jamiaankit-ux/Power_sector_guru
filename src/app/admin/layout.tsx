import type { Metadata, Viewport } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logout } from "@/app/actions/auth";
import { AdminShell, type NavItem } from "@/components/admin/AdminShell";

// The admin app: its own shell and its own installable app, separate from the learner website.
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, manifest: "/admin-app.webmanifest", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#0b1b3f", width: "device-width", initialScale: 1, viewportFit: "cover" };

// staff: true = instructors can see it too
const groups: { title: string; items: (NavItem & { staff?: boolean })[] }[] = [
  { title: "Overview", items: [{ href: "/admin", icon: "BarChart3", label: "Dashboard" }] },
  { title: "Teaching", items: [
    { href: "/admin/courses", icon: "BookOpen", label: "Courses", staff: true },
    { href: "/admin/media", icon: "ImageIcon", label: "Media and videos", staff: true },
    { href: "/admin/discussions", icon: "MessageSquare", label: "Doubts", staff: true },
    { href: "/admin/tutor", icon: "Sparkles", label: "AI assistant" },
  ] },
  { title: "Sales", items: [
    { href: "/admin/orders", icon: "CreditCard", label: "Orders" },
    { href: "/admin/coupons", icon: "Tag", label: "Discount codes" },
    { href: "/admin/pricing", icon: "Package", label: "Plans and bundles" },
  ] },
  { title: "Learners", items: [
    { href: "/admin/users", icon: "Users", label: "Learners" },
    { href: "/admin/certificates", icon: "Award", label: "Certificates" },
    { href: "/admin/announcements", icon: "Megaphone", label: "Announcements" },
    { href: "/admin/notifications", icon: "Bell", label: "Push notifications" },
  ] },
  { title: "Website", items: [
    { href: "/admin/site/home", icon: "Home", label: "Home page" },
    { href: "/admin/site/dashboard", icon: "LayoutDashboard", label: "Learner dashboard" },
    { href: "/admin/site/pages", icon: "FileText", label: "Pages" },
    { href: "/admin/site/brand", icon: "Palette", label: "Brand and menus" },
  ] },
  { title: "System", items: [
    { href: "/admin/integrations", icon: "Plug", label: "Payments and integrations" },
    { href: "/admin/settings", icon: "Settings", label: "Business and policies" },
    { href: "/admin/audit", icon: "History", label: "Activity log" },
  ] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const s = await getSettings();
  const visible = groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => me.role === "ADMIN" || i.staff).map(({ href, icon, label }) => ({ href, icon, label })) }))
    .filter((g) => g.items.length);
  return <AdminShell groups={visible} user={{ name: me.name, role: me.role }} siteName={s.siteName} logout={logout}>{children}</AdminShell>;
}
