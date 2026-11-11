import { Apple, Laptop, Monitor, Smartphone } from "lucide-react";

export const metadata = { title: "Get the app" };

const steps = [
  { icon: Smartphone, name: "Android", how: ["Open this site in Chrome", "Tap the ⋮ menu", "Choose “Install app” or “Add to Home screen”"], extra: "A Play Store app is also available from the same codebase (see README)." },
  { icon: Apple, name: "iPhone and iPad", how: ["Open this site in Safari", "Tap the Share button", "Choose “Add to Home Screen”"], extra: "An App Store build is also available from the same codebase." },
  { icon: Monitor, name: "Windows", how: ["Open this site in Edge or Chrome", "Click the install icon in the address bar", "Power Sector Academy opens in its own window and appears in the Start menu"] },
  { icon: Laptop, name: "Mac", how: ["Open in Chrome or Edge and click the install icon, or", "In Safari (macOS Sonoma+): File → Add to Dock"] },
];

export default function Install() {
  return (
    <div className="container-x py-12">
      <h1 className="h-section">Get Power Sector Academy on every device</h1>
      <p className="muted mt-2 max-w-2xl">Your progress, notes and certificates sync automatically across phone, tablet and computer. Install takes a few seconds and needs no app store.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {steps.map(({ icon: Icon, name, how, extra }) => (
          <div key={name} className="card p-6">
            <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-brand-600" /><div className="text-lg font-bold">{name}</div></div>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">{how.map((h) => <li key={h}>{h}</li>)}</ol>
            {extra && <p className="muted mt-3 text-xs">{extra}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
