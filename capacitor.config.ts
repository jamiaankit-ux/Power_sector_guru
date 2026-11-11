import type { CapacitorConfig } from "@capacitor/cli";

// Native Android and iPhone apps for the Play Store and App Store.
// The apps open your live website inside a native shell, so every update you deploy reaches app users instantly.
// Set APP_URL to your production domain (for example https://powersectoracademy.in) before running `npx cap sync`.
const appUrl = process.env.APP_URL || "https://power-academy.onrender.com";

const config: CapacitorConfig = {
  appId: "in.powersectoracademy.app",
  appName: "Power Sector Academy",
  webDir: "native-shell",
  server: {
    url: appUrl,
    cleartext: false,
    // Keep these hosts inside the app; everything else (e.g. payment pages, YouTube links) opens in the system browser.
    allowNavigation: [new URL(appUrl).host],
    errorPath: "offline.html",
  },
  // The website hides prices and buy buttons when it sees this marker (store billing rules), see src/lib/app-mode.ts.
  appendUserAgent: "PowerSectorAcademyApp",
  backgroundColor: "#0a0f1c",
  ios: { contentInset: "automatic", scheme: "Power Sector Academy", limitsNavigationsToAppBoundDomains: false },
  android: { allowMixedContent: false, captureInput: true },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: true, backgroundColor: "#1d4ed8", showSpinner: false, androidScaleType: "CENTER_CROP" },
    StatusBar: { style: "DARK", backgroundColor: "#1d4ed8", overlaysWebView: false },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
