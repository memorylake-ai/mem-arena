import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import { streamMem0 } from "./mem0";
import { streamMemoryLake } from "./memorylake";
import { streamSupermemory } from "./supermemory";

/**
 * Dispatch to the appropriate agent stream by agentId.
 */
export function streamAgent(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): void {
  switch (params.agentId) {
    case "memorylake":
      streamMemoryLake(writer, params);
      break;
    case "mem0":
      streamMem0(writer, params);
      break;
    case "supermemory":
      streamSupermemory(writer, params);
      break;
    default: {
      const _: never = params.agentId;
      writer.write({
        type: "error",
        errorText: `Unknown agent: ${String((params as { agentId: string }).agentId)}`,
      });
    }
  }
}
