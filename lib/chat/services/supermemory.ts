import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { convertToModelMessages, streamText } from "ai";
import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import { isOpenAIModel } from "@/lib/config";

const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;

const openai = createOpenAI({
  baseURL: process.env.LITELLM_API,
  apiKey: process.env.LITELLM_API_KEY,
});

const anthropic = createAnthropic({
  baseURL: process.env.LITELLM_API,
  apiKey: process.env.LITELLM_API_KEY,
});

function getSupermemoryModel(modelId: string, userId: string): LanguageModelV2 {
  return withSupermemory(
    isOpenAIModel(modelId) ? openai(modelId) : anthropic(modelId),
    userId,
    {
      verbose: true,
      mode: "full",
      addMemory: "always",
      apiKey: SUPERMEMORY_API_KEY,
    }
  ) as unknown as LanguageModelV2;
}

/** Data parts (e.g. data-file-ref) are filtered out by default and not sent to the model. */
export async function streamSupermemory(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): Promise<void> {
  const modelMessages = await convertToModelMessages(params.messages);
  const model = getSupermemoryModel(params.modelId, params.userId);
  const result = streamText({
    model,
    messages: modelMessages,
  });
  const uiStream = result.toUIMessageStream({
    messageMetadata: () => ({ agentId: params.agentId }),
    generateMessageId: () => params.assistantMessageId,
    sendStart: true,
    sendFinish: true,
  });
  writer.merge(
    uiStream as ReadableStream<{ type: string; [key: string]: unknown }>
  );
}
