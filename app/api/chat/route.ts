import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import {
  type ChatMessagePartOutput,
  checkLastMessageIsUser,
  parseChatBody,
  userIdHeaderSchema,
} from "@/lib/chat/schema";
import { streamAgent } from "@/lib/chat/services";
import type { ChatStreamWriter } from "@/lib/chat/types";
import { extractTextFromMessage } from "@/lib/chat/utils";
import { createMessage, updateMessageContent, updateSession } from "@/lib/db";

export async function POST(req: Request) {
  const userIdResult = userIdHeaderSchema.safeParse(
    req.headers.get("x-user-id") ?? ""
  );
  if (!userIdResult.success) {
    return Response.json(
      { success: false, message: "X-User-ID header required" },
      { status: 401 }
    );
  }
  const userId = userIdResult.data;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, message: "Bad Request" },
      { status: 400 }
    );
  }

  const parseResult = parseChatBody(body);
  if (!parseResult.success) {
    return Response.json(
      {
        success: false,
        message: "Validation failed",
        issues: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const parsed = parseResult.data;
  const lastCheck = checkLastMessageIsUser(parsed.messages);
  if (!lastCheck.success) {
    return Response.json(
      { success: false, message: lastCheck.message },
      { status: 400 }
    );
  }

  const sessionId = parsed.id;
  const messages = parsed.messages;
  const agentId = parsed.agentId;
  const modelId = parsed.modelId;
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return Response.json(
      { success: false, message: "messages required" },
      { status: 400 }
    );
  }
  const userMessageId = lastMessage.id ?? generateId();
  const userContent = extractTextFromMessage(lastMessage.parts);

  const { id: assistantMessageId } = await createMessage({
    sessionId,
    role: "assistant",
    agentId,
    providerId: modelId,
    content: "",
    replyToMessageId: userMessageId,
  });

  const streamParams: Parameters<typeof streamAgent>[1] = {
    agentId,
    modelId,
    userId,
    messages: messages as UIMessage[],
    assistantMessageId,
    memorylakeProfile: parsed.memorylakeProfile,
  };

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      await streamAgent(writer as ChatStreamWriter, streamParams);
    },
    originalMessages: messages as Parameters<
      typeof createUIMessageStream
    >[0]["originalMessages"],
    onFinish: async ({ messages: finalMessages }) => {
      await updateSession(sessionId, {
        title: userContent.slice(0, 100) ?? undefined,
      });
      for (const msg of (finalMessages ?? []) as UIMessage[]) {
        if (msg.role === "assistant" && msg.id) {
          const parts =
            "parts" in msg &&
            Array.isArray((msg as { parts: ChatMessagePartOutput[] }).parts)
              ? (msg as { parts: ChatMessagePartOutput[] }).parts
              : [];
          const content = extractTextFromMessage(parts);
          await updateMessageContent(msg.id, content);
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
