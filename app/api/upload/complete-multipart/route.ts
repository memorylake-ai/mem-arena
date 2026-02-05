import type {
  CompleteMultipartRequest,
  CompleteMultipartResponse,
} from "@/lib/upload/types";

const ARENA_API_BASE = process.env.ARENA_API_BASE;
const TRAILING_SLASH = /\/$/;

export async function POST(req: Request) {
  if (!ARENA_API_BASE) {
    return Response.json(
      {
        success: false,
        message: "Upload API is not configured (ARENA_API_BASE)",
      },
      { status: 503 }
    );
  }
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json(
      { success: false, message: "X-User-ID header required" },
      { status: 401 }
    );
  }
  let body: CompleteMultipartRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { upload_id, object_key, part_eTags } = body;
  if (
    typeof upload_id !== "string" ||
    typeof object_key !== "string" ||
    !Array.isArray(part_eTags)
  ) {
    return Response.json(
      { success: false, message: "upload_id, object_key, part_eTags required" },
      { status: 400 }
    );
  }
  const url = `${ARENA_API_BASE.replace(TRAILING_SLASH, "")}/api/v1/upload/complete-multipart`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({ upload_id, object_key, part_eTags }),
  });
  const data = (await res.json()) as CompleteMultipartResponse;
  return Response.json(data, { status: res.status });
}
