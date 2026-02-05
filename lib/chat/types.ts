import type { UIMessage } from "ai";
import type { AgentId } from "@/lib/db/schema";

/** Parameters passed to each agent stream function. Messages are converted to model messages inside each service. */
export interface ChatStreamParams {
  agentId: AgentId;
  modelId: string;
  userId: string;
  /** Full UI messages (including data-file-ref parts). Each service calls convertToModelMessages. */
  messages: UIMessage[];
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
