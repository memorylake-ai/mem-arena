import type { ModelMessage } from "@ai-sdk/provider-utils";
import { Anthropic } from "@anthropic-ai/sdk";
import type { UIMessageChunk } from "ai";
import {
  type MemorylakeProfile,
  memorylakeProfileToHeaders,
  parseMemorylakeProfile,
} from "./profile";

/** Claude Messages API request body (subset we need). */
interface ClaudeRequestBody {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string | Array<{ type: "text"; text: string }>;
  }>;
  system?: string;
  stream?: boolean;
}

/** Claude stream event (SDK or parsed SSE); subset we map to UIMessageChunk. */
interface ClaudeStreamEvent {
  type: string;
  message?: { id?: string };
  content_block?: { type: string; text?: string };
  delta?: { type?: string; text?: string; stop_reason?: string };
  index?: number;
}

function processClaudeStreamEvent(
  data: ClaudeStreamEvent,
  ctx: {
    controller: ReadableStreamDefaultController<UIMessageChunk>;
    messageId: string;
    messageMetadata: Record<string, string>;
    textBlockId: { current: string | null };
  }
): void {
  const { controller, messageId, messageMetadata, textBlockId } = ctx;
  if (data.type === "message_start") {
    controller.enqueue({
      type: "start",
      messageId,
      messageMetadata,
    } as UIMessageChunk);
    return;
  }
  if (
    data.type === "content_block_start" &&
    data.content_block?.type === "text"
  ) {
    textBlockId.current = `block-${data.index ?? 0}`;
    controller.enqueue({
      type: "text-start",
      id: textBlockId.current,
    } as UIMessageChunk);
    return;
  }
  if (
    data.type === "content_block_delta" &&
    data.delta?.type === "text_delta" &&
    data.delta.text
  ) {
    const id = textBlockId.current ?? `block-${data.index ?? 0}`;
    controller.enqueue({
      type: "text-delta",
      id,
      delta: data.delta.text,
    } as UIMessageChunk);
    return;
  }
  // Only send text-end for blocks we opened with text-start (skip thinking/other non-text blocks).
  if (data.type === "content_block_stop") {
    if (textBlockId.current !== null) {
      controller.enqueue({
        type: "text-end",
        id: textBlockId.current,
      } as UIMessageChunk);
      textBlockId.current = null;
    }
    return;
  }
  if (data.type === "message_delta" || data.type === "message_stop") {
    controller.enqueue({
      type: "finish",
      finishReason: "stop",
      messageMetadata,
    } as UIMessageChunk);
    return;
  }
  if (data.type === "error") {
    const err = data as {
      type: "error";
      error?: { message?: string };
    };
    controller.enqueue({
      type: "error",
      errorText: err.error?.message ?? "Unknown Memory Lake error",
    } as UIMessageChunk);
  }
}

function extractTextFromContent(
  content: string | Array<{ type: string; text?: string }>
): string {
  if (typeof content === "string") {
    return content;
  }
  return (content ?? [])
    .filter(
      (p): p is { type: string; text: string } =>
        p.type === "text" && typeof (p as { text?: string }).text === "string"
    )
    .map((p) => (p as { text: string }).text)
    .join("");
}

/**
 * Converts AI SDK ModelMessage[] to Claude Messages API request body.
 * Only text content is mapped; system messages are concatenated into the top-level system field.
 */
function modelMessagesToClaudeBody(
  modelMessages: ModelMessage[],
  model: string,
  maxTokens: number
): ClaudeRequestBody {
  const systemParts: string[] = [];
  const messages: ClaudeRequestBody["messages"] = [];

  for (const msg of modelMessages) {
    if (msg.role === "system") {
      systemParts.push(
        typeof msg.content === "string"
          ? msg.content
          : extractTextFromContent(
              msg.content as Array<{ type: string; text?: string }>
            )
      );
      continue;
    }
    if (msg.role !== "user" && msg.role !== "assistant") {
      continue;
    }

    const content = msg.content;
    if (typeof content === "string") {
      messages.push({ role: msg.role, content });
      continue;
    }
    const textParts = (
      content as Array<{ type: string; text?: string }>
    ).filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: string }).text === "string"
    );
    if (textParts.length === 0) {
      continue;
    }
    if (textParts.length === 1) {
      messages.push({ role: msg.role, content: textParts[0].text });
    } else {
      messages.push({
        role: msg.role,
        content: textParts.map((p) => ({
          type: "text" as const,
          text: p.text,
        })),
      });
    }
  }

  const body: ClaudeRequestBody = {
    model,
    max_tokens: maxTokens,
    messages,
    stream: true,
  };
  if (systemParts.length > 0) {
    body.system = systemParts.join("\n\n");
  }
  return body;
}

const DEFAULT_MAX_TOKENS = 4096;

export interface StreamMemoryLakeOptions {
  /** Model id (e.g. claude-4.5-sonnet). */
  modelId: string;
  /** Messages from convertToModelMessages. */
  messages: ModelMessage[];
  /** Message id for the assistant response (for persistence). */
  messageId: string;
  /** Metadata to attach (e.g. { agentId: 'memorylake' }). */
  messageMetadata?: Record<string, string>;
  /** Max tokens for the request. */
  maxTokens?: number;
  /** Profile ids for Memory Lake request headers (x-memorylake-org-id, etc.). */
  memorylakeProfile?: MemorylakeProfile;
}

/**
 * Calls Memory Lake via Anthropic SDK (client.messages.stream()), maps each
 * stream event to UIMessageChunk, and returns a ReadableStream so it can be
 * merged into createUIMessageStream for persistence and frontend.
 */
export function streamMemoryLakeToUIMessageStream(
  options: StreamMemoryLakeOptions
): ReadableStream<UIMessageChunk> {
  const {
    modelId,
    messages,
    messageId,
    messageMetadata = {},
    maxTokens = DEFAULT_MAX_TOKENS,
    memorylakeProfile,
  } = options;

  const body = modelMessagesToClaudeBody(messages, modelId, maxTokens);
  const textBlockId = { current: null as string | null };

  const validatedProfile = parseMemorylakeProfile(memorylakeProfile);
  const defaultHeaders = validatedProfile
    ? memorylakeProfileToHeaders(validatedProfile)
    : undefined;

  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      try {
        const client = new Anthropic({
          baseURL: process.env.ZOOTOPIA_API,
          apiKey: process.env.ZOOTOPIA_API_KEY,
          ...(defaultHeaders && { defaultHeaders }),
        });

        // Use standard Messages API (/v1/messages); beta uses ?beta=true and Memory Lake may not support it.
        console.log("body--", body);
        const stream = client.messages.stream({
          model: body.model,
          max_tokens: body.max_tokens,
          messages: body.messages,
          system: body.system,
        });

        for await (const event of stream) {
          processClaudeStreamEvent(event as ClaudeStreamEvent, {
            controller,
            messageId,
            messageMetadata,
            textBlockId,
          });
        }

        controller.enqueue({
          type: "finish",
          finishReason: "stop",
          messageMetadata,
        } as UIMessageChunk);
      } catch (err) {
        controller.enqueue({
          type: "error",
          errorText: err instanceof Error ? err.message : String(err),
        } as UIMessageChunk);
      } finally {
        controller.close();
      }
    },
  });
}
