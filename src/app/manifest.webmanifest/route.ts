import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Install details for the learner app (the admin app has its own at /admin-app.webmanifest).
export async function GET() {
  const s = await getSettings();
  return Response.json({ ...base, name: s.siteName }, { headers: { "Content-Type": "application/manifest+json" } });
}

const base = {
    name: "Power Sector Academy",
    short_name: "PS Academy",
    description: "Power sector courses, study material, quizzes and certificates",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0f1c",
    theme_color: "#1d4ed8",
    orientation: "any",
    categories: ["education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My learning", url: "/dashboard" },
      { name: "Browse courses", url: "/courses" },
    ],
};
