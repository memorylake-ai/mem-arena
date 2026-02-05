import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import {
  type AgentId,
  type Message,
  messages,
  type NewMessage,
  type NewSession,
  type Session,
  sessions,
} from "./schema";

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(
  data: Pick<NewSession, "id"> & Partial<Pick<NewSession, "title">>
): Promise<Session> {
  const [row] = await db
    .insert(sessions)
    .values({
      id: data.id,
      title: data.title ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to create session");
  }
  return row;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
  return row ?? null;
}

export async function listSessions(): Promise<
  Pick<Session, "id" | "title" | "updatedAt">[]
> {
  return await db
    .select({
      id: sessions.id,
      title: sessions.title,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .orderBy(desc(sessions.createdAt));
}

export async function updateSession(
  id: string,
  data: Partial<Pick<NewSession, "title">>
): Promise<Session | null> {
  const [row] = await db
    .update(sessions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Input for creating a message; id is optional and generated in this layer when omitted. */
export type CreateMessageInput = Omit<NewMessage, "id"> & { id?: string };

export async function createMessage(
  data: CreateMessageInput
): Promise<Message> {
  const id = data.id ?? nanoid();
  const [row] = await db
    .insert(messages)
    .values({ ...data, id })
    .returning();
  if (!row) {
    throw new Error("Failed to create message");
  }
  return row;
}

export async function createMessagesBatch(
  data: NewMessage[]
): Promise<Message[]> {
  if (data.length === 0) {
    return [];
  }
  const rows = await db.insert(messages).values(data).returning();
  return rows;
}

export async function getMessagesBySessionId(
  sessionId: string
): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));
}

export async function getMessageById(id: string): Promise<Message | null> {
  const [row] = await db.select().from(messages).where(eq(messages.id, id));
  return row ?? null;
}

export async function updateMessageContent(
  id: string,
  content: string
): Promise<Message | null> {
  const [row] = await db
    .update(messages)
    .set({ content })
    .where(eq(messages.id, id))
    .returning();
  return row ?? null;
}

/** Update message content and/or metadata (e.g. persist error state). */
export async function updateMessage(
  id: string,
  data: { content?: string; metadata?: Record<string, unknown> }
): Promise<Message | null> {
  const [row] = await db
    .update(messages)
    .set(data)
    .where(eq(messages.id, id))
    .returning();
  return row ?? null;
}

/** Append content to an existing assistant message (for streaming). */
export async function appendMessageContent(
  id: string,
  delta: string
): Promise<Message | null> {
  const [existing] = await db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.id, id));
  if (!existing) {
    return null;
  }
  const newContent = existing.content + delta;
  const [row] = await db
    .update(messages)
    .set({ content: newContent })
    .where(eq(messages.id, id))
    .returning();
  return row ?? null;
}

export async function getMessagesByReplyTo(
  replyToMessageId: string
): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.replyToMessageId, replyToMessageId))
    .orderBy(asc(messages.createdAt));
}

export async function updateAssistantMessageBySessionAndAgent(
  sessionId: string,
  agentId: AgentId,
  replyToMessageId: string,
  content: string
): Promise<Message | null> {
  const [row] = await db
    .update(messages)
    .set({ content })
    .where(
      and(
        eq(messages.sessionId, sessionId),
        eq(messages.agentId, agentId),
        eq(messages.replyToMessageId, replyToMessageId)
      )
    )
    .returning();
  return row ?? null;
}
