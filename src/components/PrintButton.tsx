"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="btn-ghost">Print / save as PDF</button>;
}
