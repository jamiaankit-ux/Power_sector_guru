import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { enrollments: true, certificates: true } }, activity: { select: { seconds: true } } } });
  return csvResponse("learners", [
    ["Name", "Email", "Phone", "Organisation", "Designation", "City", "Role", "Joined", "Last active", "Courses", "Certificates", "Watch hours"],
    ...users.map((x) => [x.name, x.email, x.phone, x.organization, x.designation, x.city, x.role, x.createdAt.toISOString().slice(0, 10), x.lastActiveAt.toISOString().slice(0, 10), x._count.enrollments, x._count.certificates, (x.activity.reduce((a, d) => a + d.seconds, 0) / 3600).toFixed(1)]),
  ]);
}
