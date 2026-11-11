"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHeartbeat } from "./heartbeat";
import { Notes } from "./Notes";

type YTPlayer = { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; seekTo(s: number, a: boolean): void; setPlaybackRate(r: number): void };
declare global { interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void } }

const ytId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];

export function VideoPlayer({ lessonId, url, startAt, notes, onCertificate }: { lessonId: string; url: string; startAt: number; notes: { id: string; body: string; positionSec: number }[]; onCertificate?: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const ytEl = useRef<HTMLDivElement>(null);
  const yt = useRef<YTPlayer | null>(null);
  const [rate, setRate] = useState(1);
  const [cert, setCert] = useState<string | null>(null);
  const youtube = ytId(url);

  useEffect(() => {
    if (!youtube || !ytEl.current) return;
    const make = () => {
      yt.current = new window.YT!.Player(ytEl.current!, {
        videoId: youtube, width: "100%", height: "100%",
        playerVars: { start: Math.floor(startAt), rel: 0, modestbranding: 1, playsinline: 1 },
      });
    };
    if (window.YT?.Player) make();
    else {
      window.onYouTubeIframeAPIReady = make;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  }, [youtube, startAt]);

  const getPos = () => (youtube ? yt.current?.getCurrentTime?.() ?? 0 : video.current?.currentTime ?? 0);
  const getDur = () => (youtube ? yt.current?.getDuration?.() ?? 0 : video.current?.duration || 0);
  const playing = () => (youtube ? yt.current?.getPlayerState?.() === 1 : !!video.current && !video.current.paused && !video.current.ended);
  const seek = (s: number) => { if (youtube) yt.current?.seekTo(s, true); else if (video.current) { video.current.currentTime = s; video.current.play(); } };

  useHeartbeat(lessonId, playing, getPos, getDur, (c) => { setCert(c); router.refresh(); });

  const changeRate = (r: number) => {
    setRate(r);
    if (youtube) yt.current?.setPlaybackRate(r);
    else if (video.current) video.current.playbackRate = r;
  };

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden bg-black lg:rounded-2xl">
        {youtube ? <div ref={ytEl} className="h-full w-full" /> : (
          <video
            ref={video} src={url} controls playsInline preload="metadata" className="h-full w-full" controlsList="nodownload"
            onLoadedMetadata={(e) => { if (startAt > 5 && startAt < e.currentTarget.duration - 5) e.currentTarget.currentTime = startAt; }}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 px-4 text-sm lg:px-0">
        <span className="muted">Speed</span>
        {[0.75, 1, 1.25, 1.5, 2].map((r) => (
          <button key={r} onClick={() => changeRate(r)} className={`rounded-lg px-2.5 py-1 font-medium ${rate === r ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>{r}×</button>
        ))}
      </div>
      {(cert || onCertificate) && (
        <div className="mx-4 mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 lg:mx-0 dark:bg-emerald-500/10 dark:text-emerald-200">
          🎉 Course complete! <a className="font-semibold underline" href={`/certificates/${cert ?? onCertificate}`}>View your certificate</a>
        </div>
      )}
      <div className="mt-6 px-4 lg:px-0">
        <h3 className="mb-3 font-semibold">My notes</h3>
        <Notes lessonId={lessonId} initial={notes} getTime={getPos} seek={seek} />
      </div>
    </div>
  );
}
