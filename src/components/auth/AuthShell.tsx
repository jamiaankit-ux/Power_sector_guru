import { Award, BarChart3, PlayCircle } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="container-x grid min-h-[calc(100vh-4rem)] items-center gap-12 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h2 className="text-4xl font-extrabold tracking-tight">Learn the grid.<br /><span className="text-brand-600 dark:text-volt-400">Lead the transition.</span></h2>
        <ul className="mt-8 space-y-5">
          {[[PlayCircle, "Video lectures and study notes from senior practitioners"], [BarChart3, "Track watch hours, quiz scores and streaks"], [Award, "Earn certificates employers can verify"]].map(([I, t]) => {
            const Icon = I as React.ElementType;
            return <li key={t as string} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Icon className="h-5 w-5" /></span>{t as string}</li>;
          })}
        </ul>
      </div>
      <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="muted mb-6 mt-1 text-sm">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
