import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";

export const metadata = { title: "Activity log" };

export default async function AuditPage() {
  await requireFullAdmin();
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <div>
      <h1 className="h-section">Activity log</h1>
      <p className="muted mt-1 text-sm">Who changed what in the admin console (latest 300 actions, Indian time).</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-2 text-xs">{fmt.format(l.createdAt)}</td><td className="px-4 py-2">{l.userName}</td><td className="px-4 py-2 font-mono text-xs">{l.action}</td><td className="px-4 py-2 text-xs">{l.details}</td></tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={4} className="muted px-4 py-4">Nothing recorded yet.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
