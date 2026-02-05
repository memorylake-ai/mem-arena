import type { LanguageModelV2 } from "@ai-sdk/provider";
import { createMem0 } from "@mem0/vercel-ai-provider";
import type { UserContent } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { getItemDownloadUrl } from "@/lib/arena/download-url";
import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import {
  getFileUrlProvider,
  isOpenAIModel,
  providerSupportsFileType,
  providerSupportsFileUrl,
} from "@/lib/config";

const FILE_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

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

/** Extract text from user message content (string or parts). */
function getTextFromContent(content: UserContent): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: string }).text === "string"
    )
    .map((p) => p.text)
    .join("");
}

/** data-file-ref part with drive_item_id from UI message. */
interface DataFileRefPart {
  type: "data-file-ref";
  data: {
    drive_item_id?: string;
    filename?: string;
    mimeType?: string;
    size?: number;
  };
}

function isDataFileRefWithDriveId(part: unknown): part is DataFileRefPart {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: string }).type === "data-file-ref" &&
    typeof (part as DataFileRefPart).data?.drive_item_id === "string"
  );
}

/** Resolve download URLs for all data-file-ref parts with drive_item_id in the last user message. */
// biome-ignore lint: resolveFileRefs branches by provider, URL vs base64, size
async function resolveFileRefs(params: ChatStreamParams): Promise<
  | {
      ok: true;
      fileParts: Array<{
        type: "file";
        data: string;
        mediaType: string;
        filename?: string;
      }>;
    }
  | { ok: false; error: string }
> {
  const messages = params.messages;
  const lastMsg = messages.at(-1);
  if (!lastMsg || (lastMsg as { role?: string }).role !== "user") {
    return { ok: true, fileParts: [] };
  }
  const parts = (lastMsg as { parts?: unknown[] }).parts ?? [];
  const fileRefParts = parts.filter(isDataFileRefWithDriveId);
  if (fileRefParts.length === 0) {
    return { ok: true, fileParts: [] };
  }

  const provider = getFileUrlProvider(params.modelId);
  for (const ref of fileRefParts) {
    const mediaType = (ref.data.mimeType ?? "application/octet-stream").trim();
    if (!providerSupportsFileType(provider, mediaType)) {
      return {
        ok: false,
        error: `Unsupported file type for ${provider}: ${mediaType}. Supported: image/*, PDF; ${provider === "anthropic" ? "txt (text/plain)." : "audio (wav/mp3)."}`,
      };
    }
  }

  const resolved: Array<{
    type: "file";
    data: string;
    mediaType: string;
    filename?: string;
  }> = [];

  for (const ref of fileRefParts) {
    const { drive_item_id, filename, mimeType, size } = ref.data;
    if (!drive_item_id) {
      continue;
    }
    const downloadResult = await getItemDownloadUrl(
      drive_item_id,
      params.userId
    );
    if (!downloadResult.ok) {
      return { ok: false, error: downloadResult.error };
    }
    const mediaType = mimeType ?? "application/octet-stream";
    const supportsUrl = providerSupportsFileUrl(provider, mediaType);

    if (supportsUrl) {
      resolved.push({
        type: "file",
        data: downloadResult.downloadUrl,
        mediaType,
        filename,
      });
      continue;
    }

    const sizeBytes = size ?? 0;
    if (sizeBytes >= FILE_SIZE_LIMIT_BYTES) {
      return {
        ok: false,
        error: "File too large for base64 (max 20MB)",
      };
    }
    if (sizeBytes === 0) {
      return {
        ok: false,
        error: "File size unknown; cannot use base64",
      };
    }

    const res = await fetch(downloadResult.downloadUrl, {
      headers: downloadResult.headers,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Failed to fetch file: ${res.status}`,
      };
    }
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    resolved.push({
      type: "file",
      data: base64,
      mediaType,
      filename,
    });
  }

  return { ok: true, fileParts: resolved };
}

/** Data parts (e.g. data-file-ref) are filtered out by default and not sent to the model. */
export async function streamMem0(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): Promise<void> {
  const resolveResult = await resolveFileRefs(params);
  if (!resolveResult.ok) {
    writer.write({
      type: "error",
      errorText: resolveResult.error,
    });
    await params.onStreamError?.(resolveResult.error);
    return;
  }

  const { fileParts } = resolveResult;
  const modelMessages = await convertToModelMessages(params.messages);
  let messages = [...modelMessages];

  if (fileParts.length > 0) {
    const lastIdx = messages.length - 1;
    const lastMsg = messages[lastIdx];
    if (lastMsg && (lastMsg as { role?: string }).role === "user") {
      const content = (lastMsg as { content?: UserContent }).content;
      const text = getTextFromContent(content ?? "");
      const newContent: UserContent = [{ type: "text", text }, ...fileParts];
      messages = [...messages];
      (messages[lastIdx] as { content: UserContent }).content = newContent;
    }
  }

  const model = getMem0Model(params.modelId, params.userId);
  const result = streamText({
    model,
    messages,
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
