// 30-day learning-minutes bar chart (pure SVG, no chart library).
export function ActivityChart({ days }: { days: { day: string; minutes: number }[] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));
  const W = 600, H = 160, gap = 4, bw = (W - gap * (days.length - 1)) / days.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" role="img" aria-label="Minutes learned per day over the last 30 days">
        {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="4 4" />)}
        {days.map((d, i) => {
          const h = Math.max(d.minutes > 0 ? 3 : 1, (d.minutes / max) * H);
          return (
            <g key={d.day}>
              <rect x={i * (bw + gap)} y={H - h} width={bw} height={h} rx="3" className={d.minutes > 0 ? "fill-brand-600 dark:fill-brand-500" : "fill-slate-200 dark:fill-slate-800"}>
                <title>{`${d.day}: ${d.minutes} min`}</title>
              </rect>
              {i % 5 === 0 && <text x={i * (bw + gap) + bw / 2} y={H + 15} textAnchor="middle" className="fill-slate-400 text-[10px]">{d.day.slice(8)}/{d.day.slice(5, 7)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="muted mt-1 flex justify-between text-xs"><span>Peak {max} min</span><span>Last 30 days</span></div>
    </div>
  );
}
