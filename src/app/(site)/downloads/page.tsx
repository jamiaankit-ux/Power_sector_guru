import { DownloadsList } from "@/components/learn/DownloadsList";

export const metadata = { title: "Offline videos" };
export default function Downloads() {
  return <div className="container-x max-w-3xl py-8"><h1 className="h-section">Offline videos</h1><p className="muted mt-1 text-sm">Videos you saved in this app. They play without internet, stay inside the app, and are removed automatically after 30 days.</p><DownloadsList /></div>;
}
