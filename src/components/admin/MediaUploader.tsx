"use client";
import { useRouter } from "next/navigation";
import { UploadField } from "./UploadField";
import { VideoUpload } from "./VideoUpload";

export function MediaUploader() {
  const router = useRouter();
  return (
    <div className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
      <div><div className="mb-2 text-sm font-semibold">Upload a video</div><VideoUpload onDone={() => router.refresh()} /></div>
      <div><div className="mb-2 text-sm font-semibold">Upload a file or picture (PDF, slides, images)</div><UploadField name="_file" placeholder="The link appears here after upload" onUploaded={() => router.refresh()} /></div>
    </div>
  );
}
