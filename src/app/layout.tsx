import type { Metadata, Viewport } from "next";
import "./globals.css";
import { isNativeApp } from "@/lib/app-mode";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.siteName}: ${s.tagline}`, template: `%s · ${s.siteName}` },
    description: s.heroText,
    applicationName: s.siteName,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "black-translucent" },
    icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#1d4ed8" }, { media: "(prefers-color-scheme: dark)", color: "#0a0f1c" }],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const inApp = await isNativeApp();
  return (
    <html lang="en" suppressHydrationWarning className={inApp ? "app-mode" : undefined}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
