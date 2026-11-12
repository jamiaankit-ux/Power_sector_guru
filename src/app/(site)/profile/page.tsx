import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const u = await requireUser("/profile");
  return <div className="container-x py-8"><h1 className="h-section mb-6">Profile</h1><ProfileForm u={u} /></div>;
}
