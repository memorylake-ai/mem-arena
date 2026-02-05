import { z } from "zod";
import { AGENT_IDS } from "@/lib/agents";
import { MODEL_IDS } from "@/lib/config";

/** Schema for x-user-id header: non-empty string. */
export const userIdHeaderSchema = z
  .string()
  .min(1, "X-User-ID header required");

/** Part of a chat message (type + optional text). */
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

/** Output type for one message part (for extractTextFromMessage and route). */
export type ChatMessagePartOutput = z.output<typeof messagePartSchema>;

/** Single chat UI message. */
const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "system", "assistant"]),
  parts: z.array(messagePartSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Body schema for POST /api/chat. */
export const chatBodySchema = z.object({
  id: z.string().min(1, "id (sessionId) required"),
  messages: z.array(chatMessageSchema).min(1, "messages required"),
  agentId: z.enum(AGENT_IDS, {
    message: "agentId required and must be memorylake | mem0 | supermemory",
  }),
  modelId: z.string().min(1, "modelId required"),
  memorylakeProfile: z.record(z.string(), z.unknown()).optional(),
});

type ChatMessageOutput = z.output<typeof chatMessageSchema>;

/** Require last message to be from user (use after parsing body). */
export function checkLastMessageIsUser(
  messages: ChatMessageOutput[]
): { success: true } | { success: false; message: string } {
  const last = messages.at(-1);
  if (last?.role !== "user") {
    return { success: false, message: "last message must be user" };
  }
  return { success: true };
}

export type ChatBodyOutput = z.output<typeof chatBodySchema>;

/** Parse and validate chat request body. Returns result with data or error. */
export function parseChatBody(
  body: unknown
): z.ZodSafeParseResult<ChatBodyOutput> {
  return chatBodySchema.safeParse(body);
}

/** Validate modelId is supported; returns valid ModelId or default. */
export function normalizeModelId(
  modelIdRaw: string | undefined,
  supportedIds: readonly string[] = MODEL_IDS
): (typeof MODEL_IDS)[number] {
  const defaultId = "gpt-5-mini" as (typeof MODEL_IDS)[number];
  if (!modelIdRaw) {
    return defaultId;
  }
  if (supportedIds.includes(modelIdRaw)) {
    return modelIdRaw as (typeof MODEL_IDS)[number];
  }
  return defaultId;
}
