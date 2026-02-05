import type {
  CreateMultipartRequest,
  CreateMultipartResponse,
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
  let body: CreateMultipartRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { file_size } = body;
  if (typeof file_size !== "number" || file_size < 0) {
    return Response.json(
      { success: false, message: "file_size must be a non-negative number" },
      { status: 400 }
    );
  }
  const url = `${ARENA_API_BASE.replace(TRAILING_SLASH, "")}/api/v1/upload/create-multipart`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({ file_size }),
  });
  const data = (await res.json()) as CreateMultipartResponse;
  return Response.json(data, { status: res.status });
}
