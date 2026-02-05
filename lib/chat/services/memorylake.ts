import { convertToModelMessages } from "ai";
import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import { parseMemorylakeProfile } from "@/lib/memorylake/profile";
import { streamMemoryLakeToUIMessageStream } from "@/lib/memorylake/stream";

/** Data parts (e.g. data-file-ref) are filtered out by default and not sent to the model. */
export async function streamMemoryLake(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): Promise<void> {
  const baseUrl = process.env.ZOOTOPIA_API;
  const apiKey = process.env.ZOOTOPIA_API_KEY;
  if (!(baseUrl && apiKey)) {
    const errorText =
      "Memory Lake is not configured (ZOOTOPIA_API, ZOOTOPIA_API_KEY)";
    writer.write({ type: "error", errorText });
    await params.onStreamError?.(errorText);
    return;
  }
  const modelMessages = await convertToModelMessages(params.messages);
  const memorylakeProfile = parseMemorylakeProfile(params.memorylakeProfile);
  const uiStream = streamMemoryLakeToUIMessageStream({
    modelId: params.modelId,
    messages: modelMessages,
    messageId: params.assistantMessageId,
    messageMetadata: { agentId: params.agentId },
    ...(memorylakeProfile && { memorylakeProfile }),
  });
  writer.merge(uiStream);
}
