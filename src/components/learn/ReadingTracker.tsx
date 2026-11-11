"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useHeartbeat } from "./heartbeat";
import { completeLesson } from "@/app/actions/learn";

/** Counts reading time while the learner is active on the page, and offers "Mark as complete". */
export function ReadingTracker({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const last = useRef(Date.now());
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [cert, setCert] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const bump = () => { last.current = Date.now(); };
    const evs = ["scroll", "mousemove", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  useHeartbeat(lessonId, () => Date.now() - last.current < 90_000, () => 0, () => 0);
  return (
    <div className="mt-8">
      {done ? (
        <div className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="h-5 w-5" />Completed</div>
      ) : (
        <button className="btn-primary" disabled={pending} onClick={() => start(async () => { const r = await completeLesson(lessonId); setDone(true); setCert(r.certificate); router.refresh(); })}>
          <CheckCircle2 className="h-4 w-4" />Mark as complete
        </button>
      )}
      {cert && <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">🎉 Course complete! <a className="font-semibold underline" href={`/certificates/${cert}`}>View your certificate</a></p>}
    </div>
  );
}
