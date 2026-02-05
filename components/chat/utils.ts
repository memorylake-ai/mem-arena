import type { SessionMessageDTO } from "@/app/actions/chat";
import type { AgentId } from "@/lib/db/schema";
import type { ChatUIMessage, ChatUIMessagePart } from "./types";

function parseAttachment(a: Record<string, unknown>): {
  drive_item_id?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
} {
  return {
    drive_item_id:
      typeof a.drive_item_id === "string" ? a.drive_item_id : undefined,
    filename: typeof a.filename === "string" ? a.filename : undefined,
    size: typeof a.size === "number" ? a.size : undefined,
    mimeType: typeof a.mimeType === "string" ? a.mimeType : undefined,
  };
}

export function dtoToUIMessage(d: SessionMessageDTO): ChatUIMessage {
  const isError =
    d.metadata && typeof d.metadata.isError === "boolean"
      ? d.metadata.isError
      : undefined;
  const textPart: ChatUIMessagePart = { type: "text", text: d.content };
  const fileRefParts: ChatUIMessagePart[] = Array.isArray(d.attachments)
    ? d.attachments.map((a) => ({
        type: "data-file-ref" as const,
        data: parseAttachment(a),
      }))
    : [];
  return {
    id: d.id,
    role: d.role,
    parts: [textPart, ...fileRefParts],
    ...(d.agentId != null || d.providerId != null || isError !== undefined
      ? {
          metadata: {
            ...(d.agentId != null ? { agentId: d.agentId as AgentId } : {}),
            ...(d.providerId != null ? { providerId: d.providerId } : {}),
            ...(isError !== undefined ? { isError } : {}),
          },
        }
      : {}),
  };
}

/**
 * Partition flat session messages into one list per agent: each list is
 * [user1, asst1, user2, asst2, ...] for that agent's assistants.
 */
export function partitionSessionMessages(
  dtos: SessionMessageDTO[],
  agentIds: readonly AgentId[]
): SessionMessageDTO[][] {
  const rounds: { user: SessionMessageDTO; assistants: SessionMessageDTO[] }[] =
    [];
  let i = 0;
  while (i < dtos.length) {
    const msg = dtos[i];
    if (msg.role !== "user") {
      i += 1;
      continue;
    }
    const assistants = dtos.filter(
      (m) => m.role === "assistant" && m.replyToMessageId === msg.id
    );
    rounds.push({ user: msg, assistants });
    i += 1 + assistants.length;
  }
  return agentIds.map((agentId) =>
    rounds.flatMap((r) => {
      const asst = r.assistants.find((a) => a.agentId === agentId);
      return asst != null ? [r.user, asst] : [r.user];
    })
  );
}
