import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: { default: "Power Sector Academy: Making you ready for AI-enabled Power Sector", template: "%s · Power Sector Academy" },
  description: "Learn power systems, grid operations, renewables, electricity markets and regulation from industry experts. Video lectures, study material, quizzes and verifiable certificates.",
  applicationName: "Power Sector Academy",
  appleWebApp: { capable: true, title: "Power Sector Academy", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#1d4ed8" }, { media: "(prefers-color-scheme: dark)", color: "#0a0f1c" }],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <PwaRegister />
      </body>
    </html>
  );
}
