import { z } from "zod";
import { AGENT_IDS } from "@/lib/agents";
import { MODEL_IDS } from "@/lib/config";

/** Schema for x-user-id header: non-empty string. */
export const userIdHeaderSchema = z
  .string()
  .min(1, "X-User-ID header required");

/** Data shape for data-file-ref part (file reference, not sent to model by default). */
export const dataFileRefSchema = z.object({
  drive_item_id: z.string().optional(),
  url: z.string().optional(),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

/** Part of a chat message: text, data-file-ref (user), or AI SDK stream parts (step-start, reasoning, etc.). */
const messagePartSchema = z.union([
  z
    .object({ type: z.literal("text"), text: z.string().optional() })
    .passthrough(),
  z.object({
    type: z.literal("data-file-ref"),
    data: dataFileRefSchema,
  }),
  z.object({ type: z.string() }).passthrough(),
]);

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
