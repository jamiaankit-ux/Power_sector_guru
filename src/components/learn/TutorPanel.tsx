"use client";
import { useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { markdown } from "@/lib/markdown";

type Msg = { role: "user" | "assistant"; content: string };

export function TutorPanel({ lessonId, initial }: { lessonId: string; initial: Msg[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true); setErr(""); setQ("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    try {
      const r = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, question }) });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || "Something went wrong"); setMsgs((m) => m.slice(0, -1)); setQ(question); }
      else setMsgs((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch { setErr("Network problem. Please try again."); setMsgs((m) => m.slice(0, -1)); setQ(question); }
    setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  return (
    <section className="card mt-10 max-w-3xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white px-5 py-3 dark:border-slate-800 dark:from-brand-500/10 dark:to-transparent">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <div><div className="font-semibold">Ask the AI study assistant</div><div className="muted text-xs">Instant answers about this lesson, any time. Check important figures with your instructor.</div></div>
      </div>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 && (
          <div className="muted text-sm">Try: <button type="button" className="text-brand-600 underline" onClick={() => setQ("Explain the key idea of this lesson in simple words with an example.")}>“Explain the key idea of this lesson with an example”</button></div>
        )}
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2 text-sm text-white">{m.content}</div>
          : <div key={i} className="prose-pa max-w-[95%] rounded-2xl rounded-bl-sm bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60" dangerouslySetInnerHTML={{ __html: markdown(m.content) }} />)}
        {busy && <div className="muted flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
        <div ref={end} />
      </div>
      {err && <div className="px-5 pb-2 text-sm text-red-600">{err}</div>}
      <form onSubmit={ask} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} className="input" placeholder="Ask a doubt about this lesson…" aria-label="Your question" />
        <button className="btn-primary shrink-0" disabled={busy || !q.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </section>
  );
}
