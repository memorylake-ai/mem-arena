import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { AgentId } from "@/lib/db/schema";

/** Parameters passed to each agent stream function. */
export interface ChatStreamParams {
  agentId: AgentId;
  modelId: string;
  userId: string;
  modelMessages: ModelMessage[];
  assistantMessageId: string;
  memorylakeProfile?: unknown;
}

/**
 * Writer from createUIMessageStream execute callback.
 * Typed loosely so the real UIMessageStreamWriter from "ai" is assignable.
 */
export interface ChatStreamWriter {
  write: (chunk: unknown) => void;
  merge: (stream: ReadableStream) => void;
}
