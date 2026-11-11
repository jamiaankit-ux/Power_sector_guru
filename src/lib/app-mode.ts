import "server-only";
import { headers } from "next/headers";

/** The native Android/iPhone apps add this marker to their user agent (see capacitor.config.ts). */
export const APP_UA_MARKER = "PowerSectorAcademyApp";

/**
 * True inside the store apps. Store rules: digital course purchases inside the app must use
 * Apple/Google billing, so the apps show no prices or buy buttons; purchases happen on the website.
 */
export async function isNativeApp() {
  return ((await headers()).get("user-agent") ?? "").includes(APP_UA_MARKER);
}
