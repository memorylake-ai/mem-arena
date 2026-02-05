const ARENA_API_BASE = process.env.ARENA_API_BASE;
const TRAILING_SLASH = /\/$/;

export async function GET(req: Request) {
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
  const { searchParams } = new URL(req.url);
  const memorylake_document_id = searchParams.get("memorylake_document_id");
  const supermemory_document_id = searchParams.get("supermemory_document_id");
  if (!(memorylake_document_id && supermemory_document_id)) {
    return Response.json(
      {
        success: false,
        message:
          "memorylake_document_id and supermemory_document_id query params are required",
      },
      { status: 400 }
    );
  }
  const url = `${ARENA_API_BASE.replace(TRAILING_SLASH, "")}/api/v1/arena/documents/status?memorylake_document_id=${encodeURIComponent(memorylake_document_id)}&supermemory_document_id=${encodeURIComponent(supermemory_document_id)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-User-ID": userId },
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
