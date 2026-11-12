"use client";
import { useState } from "react";
import { Shuffle } from "lucide-react";

/** Coupon code box with a "Generate" button. */
export function CodeInput({ defaultValue = "", disabled }: { defaultValue?: string; disabled?: boolean }) {
  const [v, setV] = useState(defaultValue);
  const gen = () => { const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 8; i++) o += abc[Math.floor(Math.random() * abc.length)]; setV(o); };
  return (
    <div className="flex gap-2">
      <input name="code" value={v} onChange={(e) => setV(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} className="input font-mono uppercase" placeholder="DIWALI30" disabled={disabled} />
      {!disabled && <button type="button" onClick={gen} className="btn-ghost shrink-0" title="Generate a random code"><Shuffle className="h-4 w-4" />Generate</button>}
    </div>
  );
}
