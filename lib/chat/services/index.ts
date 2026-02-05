import type { ChatStreamParams, ChatStreamWriter } from "@/lib/chat/types";
import { streamMem0 } from "./mem0";
import { streamMemoryLake } from "./memorylake";
import { streamSupermemory } from "./supermemory";

/**
 * Dispatch to the appropriate agent stream by agentId.
 * Each service converts UI messages to model messages internally.
 */
export async function streamAgent(
  writer: ChatStreamWriter,
  params: ChatStreamParams
): Promise<void> {
  switch (params.agentId) {
    case "memorylake":
      await streamMemoryLake(writer, params);
      break;
    case "mem0":
      await streamMem0(writer, params);
      break;
    case "supermemory":
      await streamSupermemory(writer, params);
      break;
    default: {
      const exhausted: never = params.agentId;
      writer.write({
        type: "error",
        errorText: `Unknown agent: ${String(exhausted)}`,
      });
    }
  }
}
