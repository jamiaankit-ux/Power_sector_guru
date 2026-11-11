"use client";
import { useEffect, useRef } from "react";

/**
 * Counts active learning seconds (only while `isActive()` is true and the tab is visible)
 * and sends them to the server every 15 seconds and when the page is hidden.
 */
export function useHeartbeat(lessonId: string, isActive: () => boolean, getPos: () => number, getDur: () => number, onCompleted?: (cert: string | null) => void) {
  const pending = useRef(0);
  const doneRef = useRef(false);
  useEffect(() => {
    const flush = (beacon = false) => {
      const seconds = pending.current;
      const body = JSON.stringify({ lessonId, seconds, position: getPos(), duration: getDur() });
      pending.current = 0;
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        .then((r) => r.json())
        .then((j) => {
          if (j.completed && !doneRef.current) {
            doneRef.current = true;
            onCompleted?.(j.certificate ?? null);
          }
        })
        .catch(() => { pending.current += seconds; });
    };
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && isActive()) pending.current += 1;
    }, 1000);
    const send = setInterval(() => { if (pending.current > 0) flush(); }, 15000);
    const onHide = () => { if (document.visibilityState === "hidden" && pending.current > 0) flush(true); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick); clearInterval(send);
      document.removeEventListener("visibilitychange", onHide);
      if (pending.current > 0) flush(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  return { flushNow: () => {} };
}
