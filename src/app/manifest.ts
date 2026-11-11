import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Power Academy",
    short_name: "PowerAcademy",
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
}
