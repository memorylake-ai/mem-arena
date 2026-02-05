import type { GetItemDownloadUrlResponse } from "@/lib/arena/types";

const TRAILING_SLASH = /\/$/;

/**
 * Fetch download URL for a drive item from Arena backend.
 * GET /api/v1/drives/items/{item_id}/download-url
 * Response: { success: true, message: "success", data: { download_url, headers } }
 */
export async function getItemDownloadUrl(
  itemId: string,
  userId: string
): Promise<
  | { ok: true; downloadUrl: string; headers: Record<string, string> }
  | { ok: false; error: string }
> {
  const baseUrl = process.env.ARENA_API_BASE?.replace(TRAILING_SLASH, "");
  if (!baseUrl) {
    return { ok: false, error: "ARENA_API_BASE is not configured" };
  }
  const url = `${baseUrl}/api/v1/drives/items/${encodeURIComponent(itemId)}/download-url`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-User-ID": userId,
    },
  });
  const json = (await res.json()) as GetItemDownloadUrlResponse;
  if (!(res.ok && json.success && json.data?.download_url)) {
    const msg =
      (json as { message?: string }).message ??
      `Get download URL failed (${res.status})`;
    return { ok: false, error: msg };
  }
  return {
    ok: true,
    downloadUrl: json.data.download_url,
    headers: json.data.headers ?? {},
  };
}
