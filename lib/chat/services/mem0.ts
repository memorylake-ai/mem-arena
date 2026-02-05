import type { LanguageModelV2 } from "@ai-sdk/provider";
import { createMem0 } from "@mem0/vercel-ai-provider";
import { convertToModelMessages, streamText } from "ai";
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

/** Data parts (e.g. data-file-ref) are filtered out by default and not sent to the model. */
export async function streamMem0(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): Promise<void> {
  const modelMessages = await convertToModelMessages(params.messages);
  const model = getMem0Model(params.modelId, params.userId);
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
