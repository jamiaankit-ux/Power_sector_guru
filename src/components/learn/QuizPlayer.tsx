"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { submitQuiz, type QuizResult } from "@/app/actions/learn";

type Q = { text: string; options: string[] };

export function QuizPlayer({ quizId, questions, passPercent, timeLimitSec, attemptsLeft, best }: { quizId: string; questions: Q[]; passPercent: number; timeLimitSec: number; attemptsLeft: number | null; best: number | null }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(timeLimitSec);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();

  const submit = () => start(async () => { setResult(await submitQuiz(quizId, answers)); router.refresh(); });

  useEffect(() => {
    if (!started || result || !timeLimitSec) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, result, timeLimitSec]);
  useEffect(() => { if (started && timeLimitSec && left <= 0 && !result && !pending) submit(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (result) {
    return (
      <div>
        <div className={`rounded-2xl p-6 text-center ${result.passed ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}>
          <div className="text-5xl font-extrabold">{result.percent}%</div>
          <div className="mt-1 font-semibold">{result.score} of {result.total} correct · {result.passed ? "Passed" : `Pass mark is ${passPercent}%`}</div>
          {result.certificate && <a href={`/certificates/${result.certificate}`} className="btn-primary mt-4">🎉 View your certificate</a>}
          {!result.passed && (attemptsLeft === null || attemptsLeft > 1) && (
            <button className="btn-ghost mt-4" onClick={() => { setResult(null); setAnswers([]); setIdx(0); setLeft(timeLimitSec); }}><RotateCcw className="h-4 w-4" />Try again</button>
          )}
        </div>
        <ol className="mt-6 space-y-4">
          {result.review.map((r, i) => (
            <li key={i} className="card p-5">
              <div className="flex gap-2 font-medium">{r.chosen === r.correct ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}{i + 1}. {r.text}</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {r.options.map((o, j) => (
                  <li key={j} className={`rounded-lg px-3 py-2 ${j === r.correct ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : j === r.chosen ? "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200" : "bg-slate-50 dark:bg-slate-800/50"}`}>{o}</li>
                ))}
              </ul>
              {r.explanation && <p className="muted mt-3 text-sm"><b>Explanation:</b> {r.explanation}</p>}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="card p-8 text-center">
        <div className="text-lg font-semibold">{questions.length} questions{timeLimitSec ? ` · ${Math.round(timeLimitSec / 60)} minutes` : ""} · pass mark {passPercent}%</div>
        {best !== null && <p className="muted mt-2">Your best score so far: <b>{best}%</b></p>}
        {attemptsLeft !== null && <p className="muted mt-1 text-sm">{attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left</p>}
        <button className="btn-primary mt-6 px-8 py-3" disabled={attemptsLeft === 0} onClick={() => setStarted(true)}>{best !== null ? "Retake quiz" : "Start quiz"}</button>
      </div>
    );
  }

  const q = questions[idx];
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between text-sm">
        <span className="muted">Question {idx + 1} of {questions.length}</span>
        {timeLimitSec > 0 && <span className={`flex items-center gap-1 font-mono font-semibold ${left < 30 ? "text-rose-600" : ""}`}><Clock className="h-4 w-4" />{Math.floor(Math.max(left, 0) / 60)}:{String(Math.max(left, 0) % 60).padStart(2, "0")}</span>}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-brand-600 transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} /></div>
      <h3 className="mt-6 text-lg font-semibold">{q.text}</h3>
      <div className="mt-4 space-y-2">
        {q.options.map((o, j) => (
          <button key={j} onClick={() => setAnswers((a) => { const n = [...a]; n[idx] = j; return n; })}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${answers[idx] === j ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${answers[idx] === j ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{String.fromCharCode(65 + j)}</span>{o}
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-between">
        <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
        {idx < questions.length - 1 ? (
          <button className="btn-primary" onClick={() => setIdx(idx + 1)}>Next</button>
        ) : (
          <button className="btn-primary" disabled={pending || answers.filter((a) => a !== undefined).length < questions.length} onClick={submit}>{pending ? "Submitting…" : "Submit answers"}</button>
        )}
      </div>
    </div>
  );
}
