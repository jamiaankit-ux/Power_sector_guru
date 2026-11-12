"use client";
// Offline videos inside the Android / iPhone apps. Files are saved in the app's private storage
// (not the gallery, Downloads folder or Files app), listed in a small index file, and expire after 30 days.

export type OfflineItem = { lessonId: string; title: string; file: string; size: number; savedAt: number; expires: number; owner: string };
const INDEX = "offline/index.json";
const DAYS = 30;

export async function native() {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}
async function fs() {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  return { Filesystem, dir: Directory.Library, Encoding };
}

export async function readIndex(): Promise<OfflineItem[]> {
  const { Filesystem, dir, Encoding } = await fs();
  try {
    const r = await Filesystem.readFile({ path: INDEX, directory: dir, encoding: Encoding.UTF8 });
    const items: OfflineItem[] = JSON.parse(String(r.data));
    const live = items.filter((i) => i.expires > Date.now());
    for (const gone of items.filter((i) => i.expires <= Date.now())) await Filesystem.deleteFile({ path: gone.file, directory: dir }).catch(() => {});
    if (live.length !== items.length) await writeIndex(live);
    return live;
  } catch { return []; }
}
async function writeIndex(items: OfflineItem[]) {
  const { Filesystem, dir, Encoding } = await fs();
  await Filesystem.writeFile({ path: INDEX, directory: dir, data: JSON.stringify(items), encoding: Encoding.UTF8, recursive: true });
}

/** The MP4 to save for a lesson video, or null when it can't be saved (YouTube, or HLS without an MP4 copy). */
export function downloadSource(url: string): string[] {
  if (/youtu\.?be/.test(url)) return [];
  const bunny = url.match(/^(https:\/\/[^/]+\/[0-9a-f-]{36})\/playlist\.m3u8/i);
  if (bunny) return [`${bunny[1]}/play_720p.mp4`, `${bunny[1]}/play_480p.mp4`, `${bunny[1]}/play_360p.mp4`]; // needs "MP4 fallback" on in Bunny
  if (/\.m3u8(\?|$)/.test(url)) return [];
  return [new URL(url, location.href).href];
}

export async function saveOffline(lessonId: string, title: string, url: string, owner: string, onProgress: (pct: number) => void) {
  const { Filesystem, dir } = await fs();
  const file = `offline/${lessonId}.bin`; // no video extension, so gallery and file apps don't pick it up
  const sub = await Filesystem.addListener("progress", (p) => p.contentLength && onProgress(Math.round((p.bytes / p.contentLength) * 100)));
  try {
    let ok = false;
    for (const src of downloadSource(url)) {
      try { await Filesystem.downloadFile({ url: src, path: file, directory: dir, recursive: true, progress: true }); ok = true; break; } catch { /* try the next quality */ }
    }
    if (!ok) throw new Error("This video can't be saved for offline viewing.");
    const st = await Filesystem.stat({ path: file, directory: dir });
    const items = (await readIndex()).filter((i) => i.lessonId !== lessonId);
    items.push({ lessonId, title, file, size: st.size, savedAt: Date.now(), expires: Date.now() + DAYS * 86400_000, owner });
    await writeIndex(items);
  } finally { sub.remove(); }
}

export async function removeOffline(lessonId: string) {
  const { Filesystem, dir } = await fs();
  const items = await readIndex();
  const it = items.find((i) => i.lessonId === lessonId);
  if (it) await Filesystem.deleteFile({ path: it.file, directory: dir }).catch(() => {});
  await writeIndex(items.filter((i) => i.lessonId !== lessonId));
}

/** A URL the in-app player can read for a saved file. Only works inside this app. */
export async function playableUrl(item: OfflineItem) {
  const { Filesystem, dir } = await fs();
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.convertFileSrc((await Filesystem.getUri({ path: item.file, directory: dir })).uri);
}
