import type { CreateMultipartResponse, PartETag } from "@/lib/upload/types";
import { getBasePath } from "@/lib/utils";

export interface UploadFileOptions {
  /** Called after each part is uploaded. loaded = bytes uploaded so far, total = file.size */
  onProgress?: (loaded: number, total: number) => void;
  /** User ID sent as X-User-ID header (required by create-multipart / complete-multipart). */
  userId?: string;
}

export interface UploadFileResult {
  object_key: string;
}

/**
 * Upload a single file via multipart: create-multipart -> PUT each part to upload_url (browser direct) -> complete-multipart.
 * File bytes never go through our server; only small JSON goes to our proxy.
 */
export async function uploadFile(
  file: Blob,
  options: UploadFileOptions = {}
): Promise<UploadFileResult> {
  const { onProgress, userId } = options;
  const total = file.size;
  const createHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    createHeaders["X-User-ID"] = userId;
  }

  const createRes = await fetch(
    `${getBasePath()}/api/upload/create-multipart`,
    {
      method: "POST",
      headers: createHeaders,
      body: JSON.stringify({ file_size: total }),
    }
  );
  const createJson = (await createRes.json()) as CreateMultipartResponse;
  if (!(createRes.ok && createJson.success && createJson.data)) {
    const msg =
      createJson.message ??
      createJson.error_code ??
      `create-multipart failed (${createRes.status})`;
    throw new Error(msg);
  }

  const { upload_id, object_key, part_items } = createJson.data;
  const partETags: PartETag[] = [];
  let offset = 0;

  for (const part of part_items) {
    const chunk = file.slice(offset, offset + part.size);
    const putRes = await fetch(part.upload_url, {
      method: "PUT",
      body: chunk,
    });
    if (!putRes.ok) {
      throw new Error(`Part ${part.number} upload failed: ${putRes.status}`);
    }
    let etag = putRes.headers.get("ETag") ?? "";
    // S3 returns ETag in quotes; some APIs expect without
    if (etag.startsWith('"') && etag.endsWith('"')) {
      etag = etag.slice(1, -1);
    }
    partETags.push({ number: part.number, etag });
    offset += part.size;
    onProgress?.(offset, total);
  }

  const completeHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    completeHeaders["X-User-ID"] = userId;
  }
  const completeRes = await fetch(
    `${getBasePath()}/api/upload/complete-multipart`,
    {
      method: "POST",
      headers: completeHeaders,
      body: JSON.stringify({ upload_id, object_key, part_eTags: partETags }),
    }
  );
  const completeJson = (await completeRes.json()) as {
    success?: boolean;
    message?: string;
    error_code?: string;
  };
  if (!(completeRes.ok && completeJson.success)) {
    const msg =
      completeJson.message ??
      completeJson.error_code ??
      `complete-multipart failed (${completeRes.status})`;
    throw new Error(msg);
  }

  return { object_key };
}
