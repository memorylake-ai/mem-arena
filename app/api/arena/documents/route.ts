const ARENA_API_BASE = process.env.ARENA_API_BASE;
const TRAILING_SLASH = /\/$/;

export async function POST(req: Request) {
  if (!ARENA_API_BASE) {
    return Response.json(
      {
        success: false,
        message: "Arena API is not configured (ARENA_API_BASE)",
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
  let body: { project_id?: string; file_name?: string; object_key?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { project_id, file_name, object_key } = body;
  if (
    typeof project_id !== "string" ||
    !project_id ||
    typeof file_name !== "string" ||
    !file_name ||
    typeof object_key !== "string" ||
    !object_key
  ) {
    return Response.json(
      {
        success: false,
        message: "project_id, file_name, and object_key are required",
      },
      { status: 400 }
    );
  }
  const url = `${ARENA_API_BASE.replace(TRAILING_SLASH, "")}/api/v1/arena/documents`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({
      project_id,
      file_name,
      object_key,
      user_id: userId,
    }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
