import type { AgentId } from "@/lib/db/schema";

export type UploadStatus =
  | "idle"
  | "uploading"
  | "done"
  | "error"
  | "processing";

export interface UploadProgress {
  currentFileIndex: number;
  totalFiles: number;
  loaded: number;
  total: number;
}

export interface PendingStreams {
  providerId: string;
  text: string;
  attachments?: {
    object_key: string;
    filename?: string;
    size?: number;
    mimeType?: string;
  }[];
}

/** Text part in a chat message. */
export interface ChatUIMessageTextPart {
  type: "text";
  text: string;
}

/** File/attachment part in a chat message (display-only; object_key for API). */
export interface ChatUIMessageFilePart {
  type: "file";
  filename?: string;
  object_key?: string;
  /** File size in bytes. */
  size?: number;
  /** MIME type (e.g. image/png). */
  mimeType?: string;
}

export type ChatUIMessagePart = ChatUIMessageTextPart | ChatUIMessageFilePart;

export interface ChatUIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: ChatUIMessagePart[];
  metadata?: {
    agentId?: AgentId;
    providerId?: string;
    /** Persisted error: message content is error text. */
    isError?: boolean;
  };
}
