-- Add user_id to sessions (existing rows get '' so they won't appear in any user's list)
ALTER TABLE "sessions" ADD COLUMN "user_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Arena session cache: map hashed session cookie to user for fast lookup
CREATE TABLE "arena_session_users" (
	"session_key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"email" text,
	"avatar_url" text,
	"metadata" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
