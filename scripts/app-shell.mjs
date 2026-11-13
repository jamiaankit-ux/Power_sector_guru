// Writes the app's start address into the page shown when the first load fails (native-shell/offline.html).
// Run before `npx cap sync` (the "cap:sync" script does it). Uses the same settings as capacitor.config.ts:
//   APP_URL      your live address (default https://power-academy.onrender.com)
//   APP_VARIANT  "admin" for the owner's admin app, which starts at /admin
import { readFileSync, writeFileSync } from "node:fs";

const base = (process.env.APP_URL || "https://power-academy.onrender.com").replace(/\/$/, "");
const start = process.env.APP_VARIANT === "admin" ? base + "/admin" : base + "/";
const file = new URL("../native-shell/offline.html", import.meta.url);
const html = readFileSync(file, "utf8");
const next = html.replace(/var START_URL = "[^"]*";/, `var START_URL = ${JSON.stringify(start)};`);
if (!/var START_URL = "/.test(html)) throw new Error("START_URL line not found in native-shell/offline.html");
writeFileSync(file, next);
console.log("App start address:", start);
