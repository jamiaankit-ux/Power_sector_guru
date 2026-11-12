import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";
import { NativeBridge } from "@/components/NativeBridge";
import { isNativeApp } from "@/lib/app-mode";

// The learner-facing website and app. The admin app has its own shell in src/app/admin.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const inApp = await isNativeApp();
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      {inApp ? <NativeBridge /> : <PwaRegister />}
    </>
  );
}
