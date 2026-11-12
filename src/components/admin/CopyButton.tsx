"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600" onClick={async () => { try { await navigator.clipboard.writeText(text.startsWith("/") ? location.origin + text : text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? "Copied" : label}
    </button>
  );
}
