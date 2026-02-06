import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Session: one chat conversation. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

/** Cached user from main-domain session; keyed by hashed session cookie for performance. */
export const arenaSessionUsers = pgTable("arena_session_users", {
  sessionKey: text("session_key").primaryKey(),
  userId: text("user_id").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Message: user input or assistant output (one per agent per round). */
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  /** Which agent produced this message; null for user messages. */
  agentId: text("agent_id"),
  /** LLM used for this round; null for user messages. Same for all three assistants in one round. */
  providerId: text("provider_id"),
  content: text("content").notNull().default(""),
  /** File metadata / paths (extensible). */
  attachments: jsonb("attachments").$type<Record<string, unknown>[]>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  /** Link to the user message of this round; null for user messages. */
  replyToMessageId: text("reply_to_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type ArenaSessionUser = typeof arenaSessionUsers.$inferSelect;
export type NewArenaSessionUser = typeof arenaSessionUsers.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
/** Message role: user or assistant (from one of the three agents). */
export type MessageRole = "user" | "assistant";
/** Agent id for assistant messages: memorylake | mem0 | supermemory. */
export type AgentId = "memorylake" | "mem0" | "supermemory";
