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

/** File reference as AI SDK data part (UI-only, not sent to model by default). */
export interface ChatUIMessageDataFileRefPart {
  type: "data-file-ref";
  data: {
    object_key?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
    size?: number;
  };
}

export type ChatUIMessagePart =
  | ChatUIMessageTextPart
  | ChatUIMessageDataFileRefPart;

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
