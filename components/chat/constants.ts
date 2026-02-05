import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/db/schema";
import { getBasePath } from "@/lib/utils";

export const AGENT_LABELS: Record<AgentId, string> = Object.fromEntries(
  AGENTS.map((a) => [a.agentId, a.displayName])
) as Record<AgentId, string>;

/** Icon path in public for each agent (used with next/image). */
export const AGENT_ICON_PATHS: Record<AgentId, string> = {
  mem0: `${getBasePath()}/mem0.svg`,
  memorylake: `${getBasePath()}/memorylake.svg`,
  supermemory: `${getBasePath()}/supermemory.svg`,
};

export const PENDING_STREAMS_KEY = "chat-pending-streams";
