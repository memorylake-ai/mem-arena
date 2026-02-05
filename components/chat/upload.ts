import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { uploadFile } from "@/lib/upload/client";
import type { UploadProgress, UploadStatus } from "./types";

export type SetUploadStatus = (s: UploadStatus) => void;
export type SetUploadProgress = (
  s: UploadProgress | ((prev: UploadProgress) => UploadProgress)
) => void;
export type SetUploadError = (e: string | null) => void;

// biome-ignore lint: upload flow has many branches
export async function uploadMessageFiles(
  messageFiles: PromptInputMessage["files"],
  setUploadStatus: SetUploadStatus,
  setUploadProgress: SetUploadProgress,
  setUploadError: SetUploadError,
  userId?: string
): Promise<
  | {
      object_key: string;
      filename?: string;
      size?: number;
      mimeType?: string;
    }[]
  | null
> {
  if (!messageFiles?.length) {
    return [];
  }
  setUploadStatus("uploading");
  const fileBlobs: { blob: Blob; filename?: string }[] = [];
  for (const part of messageFiles) {
    const url =
      part.type === "file" && "url" in part
        ? (part as { url?: string }).url
        : undefined;
    const filename =
      part.type === "file" && "filename" in part
        ? (part as { filename?: string }).filename
        : undefined;
    if (url) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        fileBlobs.push({ blob, filename });
      } catch (e) {
        setUploadStatus("error");
        setUploadError(e instanceof Error ? e.message : "Failed to read file");
        return null;
      }
    }
  }
  const totalForProgress = fileBlobs.reduce((s, x) => s + x.blob.size, 0);
  let uploadedSoFar = 0;
  const attachments: {
    object_key: string;
    filename?: string;
    size?: number;
    mimeType?: string;
  }[] = [];
  setUploadProgress({
    currentFileIndex: 0,
    totalFiles: fileBlobs.length,
    loaded: 0,
    total: totalForProgress,
  });
  try {
    for (let i = 0; i < fileBlobs.length; i++) {
      const { blob, filename } = fileBlobs[i];
      setUploadProgress((prev) => ({
        ...prev,
        currentFileIndex: i,
        totalFiles: fileBlobs.length,
      }));
      const result = await uploadFile(blob, {
        onProgress: (loaded: number) => {
          setUploadProgress((prev) => ({
            ...prev,
            loaded: uploadedSoFar + loaded,
            total: totalForProgress,
          }));
        },
        userId,
      });
      uploadedSoFar += blob.size;
      attachments.push({
        object_key: result.object_key,
        filename,
        size: blob.size,
        mimeType: blob.type || undefined,
      });
    }
    setUploadStatus("done");
    return attachments;
  } catch (e) {
    setUploadStatus("error");
    setUploadError(e instanceof Error ? e.message : "Upload failed");
    return null;
  }
}
