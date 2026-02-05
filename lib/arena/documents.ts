import type {
  CreateDocumentResponse,
  DocumentStatusResponse,
} from "@/lib/arena/types";
import { getBasePath } from "@/lib/utils";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface DocumentAttachment {
  object_key: string;
  filename?: string;
}

export type SetUploadStatus = (
  s: "idle" | "uploading" | "done" | "error" | "processing"
) => void;

/**
 * Create document for one attachment, then poll status until memorylake_status is terminal.
 * Returns { drive_item_id } on success, or error message string on failure.
 */
async function createAndPollOne(
  attachment: DocumentAttachment,
  userId: string,
  projectId: string,
  basePath: string
): Promise<{ drive_item_id: string } | string> {
  const file_name =
    attachment.filename ?? attachment.object_key.split("/").pop() ?? "file";
  const createRes = await fetch(`${basePath}/api/arena/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({
      project_id: projectId,
      file_name,
      object_key: attachment.object_key,
    }),
  });
  const createJson = (await createRes.json()) as CreateDocumentResponse;
  if (!(createRes.ok && createJson.success && createJson.data)) {
    const msg =
      (createJson as { message?: string }).message ??
      `Create document failed (${createRes.status})`;
    return msg;
  }
  const { drive_item_id, memorylake_document_id, supermemory_document_id } =
    createJson.data;
  if (!(memorylake_document_id && supermemory_document_id)) {
    return "Create document response missing memorylake_document_id or supermemory_document_id";
  }
  if (!drive_item_id) {
    return "Create document response missing drive_item_id";
  }

  const statusUrl = `${basePath}/api/arena/documents/status?memorylake_document_id=${encodeURIComponent(memorylake_document_id)}&supermemory_document_id=${encodeURIComponent(supermemory_document_id)}`;
  const startedAt = Date.now();
  for (;;) {
    const statusRes = await fetch(statusUrl, {
      headers: { "X-User-ID": userId },
    });
    const statusJson = (await statusRes.json()) as DocumentStatusResponse;
    const memorylake_status = statusJson.data?.memorylake_status;

    if (memorylake_status === "okay") {
      return { drive_item_id };
    }
    if (memorylake_status === "error" || memorylake_status === "invalid") {
      return `Document processing failed (memorylake_status: ${memorylake_status})`;
    }
    if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
      return "Document processing timed out";
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export interface EnsureDocumentsReadyOptions {
  userId: string;
  projectId: string;
  attachments: DocumentAttachment[];
  setUploadStatus?: SetUploadStatus;
}

/**
 * For each attachment: create document then poll until memorylake_status is okay (or error/invalid).
 * Returns { ok: true, driveItemIds } when all succeed (ids in same order as attachments),
 * or { ok: false, error: string } on first failure.
 */
export async function ensureDocumentsReady(
  options: EnsureDocumentsReadyOptions
): Promise<
  { ok: true; driveItemIds: string[] } | { ok: false; error: string }
> {
  const { userId, projectId, attachments, setUploadStatus } = options;
  if (!projectId?.trim()) {
    return { ok: false, error: "Arena profile or project is missing" };
  }
  if (!attachments.length) {
    return { ok: true, driveItemIds: [] };
  }
  setUploadStatus?.("processing");
  const basePath = getBasePath();
  const driveItemIds: string[] = [];
  for (const attachment of attachments) {
    const result = await createAndPollOne(
      attachment,
      userId,
      projectId,
      basePath
    );
    if (typeof result === "string") {
      setUploadStatus?.("error");
      return { ok: false, error: result };
    }
    driveItemIds.push(result.drive_item_id);
  }
  setUploadStatus?.("done");
  return { ok: true, driveItemIds };
}
