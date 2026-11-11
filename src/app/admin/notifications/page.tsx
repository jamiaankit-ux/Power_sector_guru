import { db } from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth";
import { pushConfigured } from "@/lib/push";
import { sendNotification } from "@/app/actions/admin";

export const metadata = { title: "Push notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireFullAdmin();
  const { ok, error } = await searchParams;
  const [android, ios] = await Promise.all([db.pushToken.count({ where: { platform: "android" } }), db.pushToken.count({ where: { platform: "ios" } })]);
  return (
    <div>
      <h1 className="h-section">Push notifications</h1>
      <p className="muted mt-1 text-sm">Send a notification to everyone who installed the Android or iPhone app: new course launches, live sessions, offers (offers are shown on the website, not inside the app).</p>
      <div className="mt-4 flex gap-4 text-sm"><span className="chip">{android} Android devices</span><span className="chip">{ios} iPhone devices</span></div>
      {!pushConfigured() && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Push is not connected yet. Create a free Firebase project, add the Android and iOS apps to it, then paste the service account JSON into the <code>FIREBASE_SERVICE_ACCOUNT</code> setting on Render. The README has the steps.</div>}
      {ok && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}
      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <form action={sendNotification} className="card mt-6 grid max-w-2xl gap-4 p-6">
        <div><label className="label" htmlFor="title">Title</label><input id="title" name="title" maxLength={60} className="input" placeholder="New course: Grid-scale battery storage" required /></div>
        <div><label className="label" htmlFor="body">Message</label><textarea id="body" name="body" maxLength={180} rows={3} className="input" required /></div>
        <div><label className="label" htmlFor="url">Open this page when tapped</label><input id="url" name="url" defaultValue="/dashboard" className="input" placeholder="/courses/your-course" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="announce" defaultChecked />Also post it as an announcement on learners' dashboards</label>
        <div><button className="btn-primary" disabled={!pushConfigured()}>Send notification</button></div>
      </form>
    </div>
  );
}
