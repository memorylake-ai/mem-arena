import type { AgentId } from "@/lib/db/schema";

export interface AgentConfig {
  agentId: AgentId;
  displayName: string;
}

export const AGENTS: AgentConfig[] = [
  { agentId: "memorylake", displayName: "MemoryLake" },
  { agentId: "mem0", displayName: "Mem0" },
  { agentId: "supermemory", displayName: "Supermemory" },
];

/** Single source of truth for valid agent ids (used by schema and UI). */
export const AGENT_IDS = [
  "memorylake",
  "mem0",
  "supermemory",
] as const satisfies readonly AgentId[];
