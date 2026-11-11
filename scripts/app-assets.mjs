// Generates Android and iOS app icons and splash screens from the brand mark.
// Run: node scripts/app-assets.mjs   (replace BOLT/BG below, or public/icon.svg, when you have a final logo)
import sharp from "sharp";
import { readdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const BG = "#1d4ed8";
const bolt = (size, pad) => {
  const s = size, p = s * pad, w = s - 2 * p;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <g transform="translate(${p},${p}) scale(${w / 32})"><path d="M18 4 8 18h7l-2 10 11-15h-7l1-9z" fill="#fbbf24"/></g></svg>`);
};
const square = (size, pad, bg = BG, round = false) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  ${round ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>` : `<rect width="${size}" height="${size}" fill="${bg}"/>`}
  <image href="data:image/svg+xml;base64,${bolt(size, pad).toString("base64")}" width="${size}" height="${size}"/></svg>`);
const png = (svg, out) => sharp(svg).png().toFile(out);

const res = "android/app/src/main/res";
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
if (existsSync(res)) {
  for (const [d, m] of Object.entries(dens)) {
    const dir = join(res, `mipmap-${d}`);
    await png(square(48 * m, 0.18), join(dir, "ic_launcher.png"));
    await png(square(48 * m, 0.2, BG, true), join(dir, "ic_launcher_round.png"));
    await png(bolt(108 * m, 0.3), join(dir, "ic_launcher_foreground.png"));
  }
  writeFileSync(join(res, "values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  for (const dir of readdirSync(res).filter((d) => d.startsWith("drawable"))) {
    const f = join(res, dir, "splash.png");
    if (!existsSync(f)) continue;
    const meta = await sharp(f).metadata();
    const s = Math.min(meta.width, meta.height);
    const mark = await sharp(bolt(Math.round(s * 0.35), 0)).png().toBuffer();
    await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: BG } }).composite([{ input: mark, gravity: "center" }]).png().toFile(f + ".tmp");
    (await import("fs")).renameSync(f + ".tmp", f);
  }
}
const ios = "ios/App/App/Assets.xcassets";
if (existsSync(ios)) {
  await sharp(square(1024, 0.18)).flatten({ background: BG }).removeAlpha().png().toFile(join(ios, "AppIcon.appiconset/AppIcon-512@2x.png"));
  const mark = await sharp(bolt(700, 0)).png().toBuffer();
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"])
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } }).composite([{ input: mark, gravity: "center" }]).png().toFile(join(ios, "Splash.imageset", f));
}
console.log("App icons and splash screens generated.");
