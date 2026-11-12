import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { markdown } from "@/lib/markdown";

// Pages the owner writes in Admin > Website > Pages (About, Contact, FAQs, ...).
const find = (slug: string) => db.page.findUnique({ where: { slug } });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  return p ? { title: p.title, description: p.summary || undefined } : {};
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  if (!p) notFound();
  if (!p.published) {
    const u = await currentUser();
    if (u?.role !== "ADMIN") notFound();
  }
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-3xl">
        {!p.published && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Draft preview. Only admins can see this page until you publish it.</p>}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{p.title}</h1>
        {p.summary && <p className="muted mt-3 text-lg">{p.summary}</p>}
        <article className="prose-pa reading mt-8" dangerouslySetInnerHTML={{ __html: markdown(p.body) }} />
      </div>
    </div>
  );
}
