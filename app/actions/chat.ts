"use server";

import { nanoid } from "nanoid";
import {
  createMessage as dbCreateMessage,
  createSession as dbCreateSession,
  deleteSession as dbDeleteSession,
  updateSession as dbUpdateSession,
  getMessagesBySessionId,
  listSessions,
} from "@/lib/db";

// ---------------------------------------------------------------------------
// Session list (sidebar)
// ---------------------------------------------------------------------------

export interface SessionListItem {
  id: string;
  title: string | null;
  updatedAt: Date;
}

export async function getSessions(): Promise<SessionListItem[]> {
  return await listSessions();
}

// ---------------------------------------------------------------------------
// Session messages (history / replay)
// ---------------------------------------------------------------------------

export interface SessionMessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId: string | null;
  providerId: string | null;
  attachments: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  createdAt: Date;
}

export async function getSessionMessages(
  sessionId: string
): Promise<SessionMessageDTO[]> {
  const rows = await getMessagesBySessionId(sessionId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    agentId: row.agentId,
    providerId: row.providerId,
    attachments: row.attachments,
    metadata: row.metadata,
    replyToMessageId: row.replyToMessageId,
    createdAt: row.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Create session (New chat)
// ---------------------------------------------------------------------------

export async function createSession(): Promise<{ id: string }> {
  const id = nanoid();
  await dbCreateSession({ id });
  return { id };
}

// ---------------------------------------------------------------------------
// Rename / delete session (sidebar)
// ---------------------------------------------------------------------------

export async function renameSession(
  sessionId: string,
  title: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const row = await dbUpdateSession(sessionId, { title });
    return { ok: row != null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function deleteSession(
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await dbDeleteSession(sessionId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Save user message (before triggering agent streams)
// ---------------------------------------------------------------------------

export interface AttachmentInput {
  drive_item_id?: string;
  filename?: string;
  /** File size in bytes. */
  size?: number;
  /** MIME type (e.g. image/png). */
  mimeType?: string;
}

export async function saveUserMessage(
  sessionId: string,
  content: string,
  attachments?: AttachmentInput[]
): Promise<{ userMessageId: string }> {
  const userMessageId = nanoid();
  const attachmentsPayload =
    attachments?.length &&
    attachments.map((a) => ({
      ...(a.drive_item_id != null ? { drive_item_id: a.drive_item_id } : {}),
      ...(a.filename != null ? { filename: a.filename } : {}),
      ...(a.size != null ? { size: a.size } : {}),
      ...(a.mimeType != null ? { mimeType: a.mimeType } : {}),
    }));
  await dbCreateMessage({
    id: userMessageId,
    sessionId,
    role: "user",
    content,
    replyToMessageId: null,
    ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
  });
  return { userMessageId };
}
