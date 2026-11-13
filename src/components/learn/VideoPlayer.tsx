"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Airplay, Cast, Captions, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Settings, Volume2, VolumeX } from "lucide-react";
import type Hls from "hls.js";
import { useHeartbeat } from "./heartbeat";
import { Notes } from "./Notes";
import { OfflineButton } from "./OfflineButton";

type YTPlayer = { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; seekTo(s: number, a: boolean): void; setPlaybackRate(r: number): void };
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void; __onGCastApiAvailable?: (ok: boolean) => void; cast?: any; chrome?: any } }

const ytId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
/** Quality names learners understand: UHD 4K, HD, Medium, Low. */
export const qualityName = (h: number, short = false) => {
  const [name, p] = h >= 2000 ? ["UHD 4K", 2160] : h >= 1000 ? ["HD", 1080] : h >= 700 ? ["Medium", 720] : h >= 400 ? ["Low", h] : ["Data saver", h];
  return short ? name : `${name} · ${p}p`;
};
const isHls = (url: string) => /\.m3u8(\?|$)/.test(url);
const clock = (s: number) => { if (!isFinite(s)) return "0:00"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return `${h ? h + ":" + String(m).padStart(2, "0") : m}:${String(x).padStart(2, "0")}`; };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type Props = { lessonId: string; url: string; title?: string; startAt: number; notes: { id: string; body: string; positionSec: number }[]; onCertificate?: string; watermark?: string };

export function VideoPlayer(props: Props) {
  const { lessonId, url, startAt, notes, onCertificate } = props;
  const router = useRouter();
  const [cert, setCert] = useState<string | null>(null);
  const api = useRef<{ pos: () => number; dur: () => number; playing: () => boolean; seek: (s: number) => void }>({ pos: () => 0, dur: () => 0, playing: () => false, seek: () => {} });
  useHeartbeat(lessonId, () => api.current.playing(), () => api.current.pos(), () => api.current.dur(), (c) => { setCert(c); router.refresh(); });
  return (
    <div>
      {ytId(url) ? <YouTube {...props} api={api} /> : <Player {...props} api={api} />}
      {(cert || onCertificate) && (
        <div className="mx-4 mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 lg:mx-0 dark:bg-emerald-500/10 dark:text-emerald-200">
          🎉 Course complete! <a className="font-semibold underline" href={`/certificates/${cert ?? onCertificate}`}>View your certificate</a>
        </div>
      )}
      <div className="mt-6 px-4 lg:px-0">
        <h3 className="mb-3 font-semibold">My notes</h3>
        <Notes lessonId={lessonId} initial={notes} getTime={() => api.current.pos()} seek={(s) => api.current.seek(s)} />
      </div>
    </div>
  );
}

type Api = { api: React.MutableRefObject<{ pos: () => number; dur: () => number; playing: () => boolean; seek: (s: number) => void }> };

function YouTube({ url, startAt, api }: Props & Api) {
  const el = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayer | null>(null);
  const id = ytId(url)!;
  useEffect(() => {
    if (!el.current) return;
    const make = () => { yt.current = new window.YT!.Player(el.current!, { videoId: id, width: "100%", height: "100%", playerVars: { start: Math.floor(startAt), rel: 0, modestbranding: 1, playsinline: 1 } }); };
    if (window.YT?.Player) make();
    else { window.onYouTubeIframeAPIReady = make; const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(s); }
    api.current = { pos: () => yt.current?.getCurrentTime?.() ?? 0, dur: () => yt.current?.getDuration?.() ?? 0, playing: () => yt.current?.getPlayerState?.() === 1, seek: (s) => yt.current?.seekTo(s, true) };
  }, [id, startAt, api]);
  return <div className="aspect-video w-full overflow-hidden bg-black lg:rounded-2xl"><div ref={el} className="h-full w-full" /></div>;
}

function Player({ lessonId, url, title, startAt, watermark, api }: Props & Api) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hls = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const remote = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [buf, setBuf] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [level, setLevel] = useState(-1);
  const [autoHeight, setAutoHeight] = useState(0);
  const [subs, setSubs] = useState<{ index: number; name: string }[]>([]);
  const [sub, setSub] = useState(-1);
  const [menu, setMenu] = useState<null | "main" | "speed" | "quality" | "subs">(null);
  const [full, setFull] = useState(false);
  const [show, setShow] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [canCast, setCanCast] = useState(false);
  const [casting, setCasting] = useState(false);
  const [canAir, setCanAir] = useState(false);
  const [canPip, setCanPip] = useState(false);
  const [flash, setFlash] = useState("");
  const [wmPos, setWmPos] = useState(0);
  const [err, setErr] = useState("");

  // Load the source: HLS through hls.js (native on Safari/iPhone), anything else directly.
  useEffect(() => {
    const v = video.current; if (!v) return;
    setErr(""); setLevels([]); setSubs([]);
    let dead = false;
    if (isHls(url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: H }) => {
        if (dead || !H.isSupported()) return;
        const h = new H({ startPosition: startAt > 5 ? startAt : -1, capLevelToPlayerSize: true });
        hls.current = h;
        h.on(H.Events.MANIFEST_PARSED, () => {
          const seen = new Set<number>();
          setLevels(h.levels.map((l, index) => ({ index, height: l.height })).filter((l) => l.height && !seen.has(l.height) && seen.add(l.height)).sort((a, b) => b.height - a.height));
          setSubs(h.subtitleTracks.map((s, index) => ({ index, name: s.name || s.lang || `Track ${index + 1}` })));
          // Subtitles are on by default when the video has them, unless the learner switched them off before.
          const want = h.subtitleTracks.length && prefs().subs !== false ? 0 : -1;
          h.subtitleTrack = want; h.subtitleDisplay = want >= 0; setSub(want);
        });
        h.on(H.Events.LEVEL_SWITCHED, (_, d) => setAutoHeight(h.levels[d.level]?.height ?? 0));
        h.on(H.Events.ERROR, (_, d) => { if (d.fatal) { if (d.type === H.ErrorTypes.NETWORK_ERROR) h.startLoad(); else if (d.type === H.ErrorTypes.MEDIA_ERROR) h.recoverMediaError(); else setErr("This video could not be played."); } });
        h.loadSource(url); h.attachMedia(v);
      });
    } else {
      v.src = url;
      // Safari / iPhone play HLS natively: list its subtitle tracks for the same menu.
      v.textTracks.onaddtrack = () => {
        const tracks = Array.from(v.textTracks).filter((t) => t.kind === "subtitles" || t.kind === "captions");
        setSubs(tracks.map((t, index) => ({ index, name: t.label || t.language || `Track ${index + 1}` })));
        const want = tracks.length && prefs().subs !== false ? 0 : -1;
        tracks.forEach((t, i) => { t.mode = i === want ? "showing" : "disabled"; });
        setSub(want);
      };
    }
    setCanAir(typeof (v as any).webkitShowPlaybackTargetPicker === "function");
    setCanPip(!!document.pictureInPictureEnabled);
    return () => { dead = true; hls.current?.destroy(); hls.current = null; };
  }, [url, startAt]);

  // Remember volume and speed between lessons.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("psa-player") || "{}");
      const v = video.current; if (!v) return;
      if (typeof p.vol === "number") { v.volume = p.vol; setVol(p.vol); }
      if (typeof p.rate === "number") { v.playbackRate = p.rate; setRate(p.rate); }
    } catch {}
  }, []);
  const prefs = () => { try { return JSON.parse(localStorage.getItem("psa-player") || "{}"); } catch { return {}; } };
  const remember = (patch: object) => { try { localStorage.setItem("psa-player", JSON.stringify({ ...JSON.parse(localStorage.getItem("psa-player") || "{}"), ...patch })); } catch {} };

  // Chromecast (Chrome on computers and Android). Not available inside the store apps' web view.
  useEffect(() => {
    if (!("chrome" in window) || /PowerSectorAcademyApp/.test(navigator.userAgent)) return;
    const init = () => {
      try {
        const ctx = window.cast.framework.CastContext.getInstance();
        ctx.setOptions({ receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
        setCanCast(true);
        ctx.addEventListener(window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e: any) => {
          const S = window.cast.framework.SessionState;
          if (e.sessionState === S.SESSION_ENDED) { const at = remote.current?.currentTime; setCasting(false); remote.current = null; if (video.current && at) video.current.currentTime = at; }
        });
      } catch {}
    };
    if (window.cast?.framework) init();
    else {
      window.__onGCastApiAvailable = (ok) => ok && init();
      if (!document.querySelector("script[data-cast]")) { const s = document.createElement("script"); s.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"; s.dataset.cast = "1"; document.body.appendChild(s); }
    }
  }, []);

  async function startCast() {
    try {
      const ctx = window.cast.framework.CastContext.getInstance();
      await ctx.requestSession();
      const v = video.current!;
      const info = new window.chrome.cast.media.MediaInfo(new URL(url, location.href).href, isHls(url) ? "application/x-mpegURL" : "video/mp4");
      info.metadata = new window.chrome.cast.media.GenericMediaMetadata(); info.metadata.title = title ?? "Lesson";
      const req = new window.chrome.cast.media.LoadRequest(info); req.currentTime = v.currentTime; req.autoplay = true;
      await ctx.getCurrentSession().loadMedia(req);
      v.pause();
      remote.current = new window.cast.framework.RemotePlayer();
      new window.cast.framework.RemotePlayerController(remote.current);
      setCasting(true);
    } catch { /* cancelled */ }
  }
  const stopCast = () => window.cast?.framework.CastContext.getInstance().endCurrentSession(true);

  // Expose position to notes and the watch-time tracker (also while casting to a TV).
  useEffect(() => {
    api.current = {
      pos: () => (remote.current?.isConnected ? remote.current.currentTime : video.current?.currentTime ?? 0),
      dur: () => (remote.current?.isConnected ? remote.current.duration : video.current?.duration || 0),
      playing: () => (remote.current?.isConnected ? !remote.current.isPaused : !!video.current && !video.current.paused && !video.current.ended),
      seek: (s) => { const v = video.current; if (v) { v.currentTime = s; v.play().catch(() => {}); } },
    };
  }, [api]);

  const toggle = useCallback(() => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); }, []);
  const skip = useCallback((d: number) => { const v = video.current; if (!v) return; v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, v.currentTime + d)); setFlash(d > 0 ? `+${d}s` : `${d}s`); setTimeout(() => setFlash(""), 500); }, []);
  const setVolume = (x: number) => { const v = video.current; if (!v) return; v.volume = x; v.muted = x === 0; setVol(x); setMuted(x === 0); remember({ vol: x }); };
  const setSpeed = (r: number) => { const v = video.current; if (v) v.playbackRate = r; setRate(r); remember({ rate: r }); setMenu(null); };
  const setQuality = (i: number) => { if (hls.current) hls.current.currentLevel = i; setLevel(i); setMenu(null); };
  const setSubtitle = (i: number) => {
    const h = hls.current, v = video.current;
    if (h) { h.subtitleTrack = i; h.subtitleDisplay = i >= 0; }
    else if (v) Array.from(v.textTracks).filter((t) => t.kind === "subtitles" || t.kind === "captions").forEach((t, k) => { t.mode = k === i ? "showing" : "disabled"; });
    setSub(i); remember({ subs: i >= 0 }); setMenu(null);
  };
  const fullscreen = useCallback(() => {
    const b = box.current as any, v = video.current as any;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (b?.requestFullscreen) b.requestFullscreen().then(() => (screen.orientation as any)?.lock?.("landscape").catch(() => {})).catch(() => {});
    else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone
  }, []);
  const pip = () => { const v = video.current; if (!v) return; if (document.pictureInPictureElement) document.exitPictureInPicture(); else v.requestPictureInPicture?.().catch(() => {}); };

  const wake = useCallback(() => {
    setShow(true); clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (video.current && !video.current.paused) { setShow(false); setMenu(null); } }, 3000);
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const v = video.current; if (!v) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") { e.preventDefault(); toggle(); }
      else if (k === "arrowleft" || k === "j") skip(-10);
      else if (k === "arrowright" || k === "l") skip(10);
      else if (k === "f") fullscreen();
      else if (k === "m") { v.muted = !v.muted; setMuted(v.muted); }
      else if (k === "arrowup") { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); setVol(v.volume); }
      else if (k === "arrowdown") { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); setVol(v.volume); }
      else if (k === ">" ) setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(v.playbackRate) + 1)] ?? 1);
      else if (k === "<") setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(v.playbackRate) - 1)] ?? 1);
      else return;
      wake();
    };
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggle, skip, fullscreen, wake]);

  useEffect(() => { if (!watermark) return; const i = setInterval(() => setWmPos((p) => (p + 1) % 4), 20000); return () => clearInterval(i); }, [watermark]);

  // Double-tap the left or right side to jump 10 seconds; single tap shows controls or plays/pauses.
  const lastTap = useRef(0);
  const onSurface = (e: React.MouseEvent) => {
    const now = Date.now(), r = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (now - lastTap.current < 300 && (x < 0.35 || x > 0.65)) { skip(x < 0.35 ? -10 : 10); lastTap.current = 0; return; }
    lastTap.current = now;
    if (matchMedia("(pointer: coarse)").matches && !show) { wake(); return; }
    toggle(); wake();
  };

  const q = level === -1 ? `Auto${autoHeight ? ` (${qualityName(autoHeight, true)})` : ""}` : qualityName(levels.find((l) => l.index === level)?.height ?? 0, true);
  const btn = "grid h-9 w-9 place-items-center rounded-lg text-white/90 hover:bg-white/15 hover:text-white";
  const row = "flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10";

  return (
    <div>
      <div ref={box} className={`group relative w-full select-none overflow-hidden bg-black ${full ? "h-screen" : "aspect-video lg:rounded-2xl"}`} onMouseMove={wake} onMouseLeave={() => playing && setShow(false)} style={{ cursor: show ? "default" : "none" }}>
        <video
          ref={video} playsInline preload="metadata" className="h-full w-full" controlsList="nodownload" disablePictureInPicture={false}
          onLoadedMetadata={(e) => { const v = e.currentTarget; setDur(v.duration); if (!hls.current && startAt > 5 && startAt < v.duration - 5) v.currentTime = startAt; }}
          onTimeUpdate={(e) => { const v = e.currentTarget; setT(v.currentTime); if (v.buffered.length) setBuf(v.buffered.end(v.buffered.length - 1)); }}
          onDurationChange={(e) => setDur(e.currentTarget.duration)}
          onPlay={() => { setPlaying(true); wake(); }} onPause={() => { setPlaying(false); setShow(true); }}
          onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
          onVolumeChange={(e) => { setVol(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
          onError={() => !hls.current && setErr("This video could not be played. Check your connection and try again.")}
          onContextMenu={(e) => e.preventDefault()}
        />
        {watermark && <div aria-hidden className={`pointer-events-none absolute z-10 text-xs font-medium text-white/30 transition-all duration-1000 ${["left-4 top-4", "right-4 top-10", "bottom-20 left-6", "bottom-28 right-6"][wmPos]}`}>{watermark}</div>}

        {/* Tap / click surface */}
        <div className="absolute inset-0 z-10" onClick={onSurface} onDoubleClick={(e) => { const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; if (x >= 0.35 && x <= 0.65) fullscreen(); }} />

        {waiting && !err && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" /></div>}
        {flash && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><span className="rounded-full bg-black/60 px-4 py-2 text-lg font-bold text-white">{flash}</span></div>}
        {!playing && !waiting && !err && !casting && <button onClick={toggle} aria-label="Play" className="absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-600/90 text-white shadow-xl transition hover:scale-105"><Play className="h-7 w-7 translate-x-0.5 fill-current" /></button>}
        {err && <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 p-6 text-center text-sm text-white"><div>{err}<button onClick={() => location.reload()} className="mt-3 block w-full rounded-lg bg-white/15 px-3 py-2">Try again</button></div></div>}
        {casting && <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/90 text-center text-white"><div><Cast className="mx-auto h-10 w-10 text-volt-400" /><div className="mt-2 font-semibold">Playing on your TV</div><button onClick={stopCast} className="mt-3 rounded-lg bg-white/15 px-4 py-2 text-sm">Stop casting</button></div></div>}

        {/* Controls */}
        <div className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 ${show || !playing || menu ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={(e) => e.stopPropagation()}>
          <div className="relative h-4">
            <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-white/25"><div className="h-full rounded-full bg-white/40" style={{ width: `${dur ? (buf / dur) * 100 : 0}%` }} /></div>
            <div className="absolute left-0 top-1.5 h-1 rounded-full bg-volt-400" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} />
            <input type="range" min={0} max={dur || 0} step="any" value={t} aria-label="Seek" onChange={(e) => { const v = video.current; if (v) { v.currentTime = Number(e.target.value); setT(v.currentTime); } }} className="player-range absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent" />
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 text-white">
            <button className={btn} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}</button>
            <button className={btn} onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 s (←)"><RotateCcw className="h-[18px] w-[18px]" /></button>
            <button className={btn} onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 s (→)"><RotateCw className="h-[18px] w-[18px]" /></button>
            <div className="group/vol hidden items-center sm:flex">
              <button className={btn} onClick={() => { const v = video.current; if (v) { v.muted = !v.muted; } }} aria-label={muted ? "Unmute" : "Mute"}>{muted || vol === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" className="player-range h-4 w-0 cursor-pointer appearance-none bg-transparent opacity-0 transition-all group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100" />
            </div>
            <span className="ml-1 whitespace-nowrap text-xs tabular-nums text-white/90">{clock(t)} / {clock(dur)}</span>
            <div className="ml-auto flex items-center gap-0.5">
              {subs.length > 0 && <button className={`${btn} ${sub >= 0 ? "text-volt-400" : ""}`} onClick={() => setMenu(menu === "subs" ? null : "subs")} aria-label="Subtitles"><Captions className="h-5 w-5" /></button>}
              {canCast && <button className={btn} onClick={casting ? stopCast : startCast} aria-label="Play on TV (Chromecast)" title="Play on TV (Chromecast)"><Cast className={`h-5 w-5 ${casting ? "text-volt-400" : ""}`} /></button>}
              {canAir && <button className={btn} onClick={() => (video.current as any)?.webkitShowPlaybackTargetPicker()} aria-label="AirPlay" title="AirPlay"><Airplay className="h-5 w-5" /></button>}
              {canPip && <button className={`${btn} hidden sm:grid`} onClick={pip} aria-label="Picture in picture" title="Picture in picture"><PictureInPicture2 className="h-5 w-5" /></button>}
              <button className={btn} onClick={() => setMenu(menu ? null : "main")} aria-label="Settings" title="Speed and quality"><Settings className={`h-5 w-5 transition ${menu ? "rotate-45" : ""}`} /></button>
              <button className={btn} onClick={fullscreen} aria-label="Full screen" title="Full screen (F)">{full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</button>
            </div>
          </div>

          {menu && (
            <div className="absolute bottom-14 right-3 max-h-64 w-56 overflow-y-auto rounded-xl bg-slate-900/95 p-1.5 text-white shadow-2xl ring-1 ring-white/10">
              {menu === "main" && <>
                <button className={row} onClick={() => setMenu("speed")}><span>Speed</span><span className="text-white/60">{rate === 1 ? "Normal" : `${rate}×`}</span></button>
                {levels.length > 0 && <button className={row} onClick={() => setMenu("quality")}><span>Quality</span><span className="text-white/60">{q}</span></button>}
                {subs.length > 0 && <button className={row} onClick={() => setMenu("subs")}><span>Subtitles</span><span className="text-white/60">{sub >= 0 ? subs[sub]?.name : "Off"}</span></button>}
              </>}
              {menu === "speed" && SPEEDS.map((r) => <button key={r} className={`${row} ${rate === r ? "text-volt-400" : ""}`} onClick={() => setSpeed(r)}>{r === 1 ? "Normal" : `${r}×`}</button>)}
              {menu === "quality" && <>
                <button className={`${row} ${level === -1 ? "text-volt-400" : ""}`} onClick={() => setQuality(-1)}>Auto <span className="text-xs text-white/50">saves data</span></button>
                {levels.map((l) => <button key={l.index} className={`${row} ${level === l.index ? "text-volt-400" : ""}`} onClick={() => setQuality(l.index)}>{qualityName(l.height)}</button>)}
              </>}
              {menu === "subs" && <>
                <button className={`${row} ${sub === -1 ? "text-volt-400" : ""}`} onClick={() => setSubtitle(-1)}>Off</button>
                {subs.map((s) => <button key={s.index} className={`${row} ${sub === s.index ? "text-volt-400" : ""}`} onClick={() => setSubtitle(s.index)}>{s.name}</button>)}
              </>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-4 text-xs lg:px-0">
        <span className="muted hidden md:inline">Shortcuts: Space play/pause · ← → 10 s · F full screen · M mute · &lt; &gt; speed</span>
        <OfflineButton lessonId={lessonId} url={url} title={title ?? "Lesson"} owner={watermark} />
      </div>
    </div>
  );
}
