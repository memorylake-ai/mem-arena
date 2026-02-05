import type { LanguageModelV2 } from "@ai-sdk/provider";
import { createMem0 } from "@mem0/vercel-ai-provider";
import { streamText } from "ai";
import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import { isOpenAIModel } from "@/lib/config";

function getMem0Model(modelId: string, userId: string): LanguageModelV2 {
  const mem0 = isOpenAIModel(modelId)
    ? createMem0({
        provider: "openai",
        mem0ApiKey: process.env.MEM0_API_KEY,
        apiKey: process.env.LITELLM_API_KEY,
        config: { baseURL: process.env.LITELLM_API },
      })
    : createMem0({
        provider: "anthropic",
        mem0ApiKey: process.env.MEM0_API_KEY,
        apiKey: process.env.LITELLM_API_KEY,
        config: { baseURL: process.env.LITELLM_API },
      });
  return mem0(modelId, { user_id: userId }) as unknown as LanguageModelV2;
}

export function streamMem0(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): void {
  const model = getMem0Model(params.modelId, params.userId);
  const result = streamText({
    model,
    messages: params.modelMessages,
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
