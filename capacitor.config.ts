import type { CapacitorConfig } from "@capacitor/cli";

// Native Android / iOS shells for the Play Store and App Store.
// The apps load your deployed website, so every update you deploy reaches app users instantly.
// Set APP_URL to your production domain before running `npx cap sync`.
const config: CapacitorConfig = {
  appId: "in.poweracademy.app",
  appName: "Power Academy",
  webDir: "public",
  server: { url: process.env.APP_URL || "https://your-domain.example", cleartext: false },
  ios: { contentInset: "automatic" },
  android: { allowMixedContent: false },
};

export default config;
