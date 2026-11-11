"use client";
import { useState, useTransition } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { addNote, deleteNote } from "@/app/actions/learn";

type N = { id: string; body: string; positionSec: number };
const ts = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Notes({ lessonId, initial, getTime, seek }: { lessonId: string; initial: N[]; getTime?: () => number; seek?: (s: number) => void }) {
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const n = await addNote(lessonId, text, getTime?.() ?? 0);
      if (n) setNotes((x) => [...x, n].sort((a, b) => a.positionSec - b.positionSec));
      setText("");
    });
  return (
    <div>
      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="input" placeholder={getTime ? "Write a note. It will be saved at the current video time." : "Write a note for this lesson"} />
        <button onClick={save} disabled={pending || !text.trim()} className="btn-primary self-end"><Bookmark className="h-4 w-4" />Save</button>
      </div>
      <ul className="mt-4 space-y-2">
        {notes.length === 0 && <li className="muted text-sm">Your private notes appear here.</li>}
        {notes.map((n) => (
          <li key={n.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
            {getTime && <button onClick={() => seek?.(n.positionSec)} className="chip shrink-0 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">{ts(n.positionSec)}</button>}
            <p className="flex-1 whitespace-pre-wrap">{n.body}</p>
            <button aria-label="Delete note" onClick={() => start(async () => { await deleteNote(n.id); setNotes((x) => x.filter((y) => y.id !== n.id)); })} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
