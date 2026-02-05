"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSession,
  getSessionMessages,
  saveUserMessage,
} from "@/app/actions/chat";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  useMemorylakeProfile,
  useProfile,
} from "@/components/profile-provider";
import { AGENT_IDS } from "@/lib/agents";
import { ensureDocumentsReady } from "@/lib/arena/documents";
import { getProviders } from "@/lib/config";
import { SESSION_PATH_PREFIX, sessionIdFromPathname } from "@/lib/session";
import { getBasePath } from "@/lib/utils";
import { PENDING_STREAMS_KEY } from "./constants";
import type {
  ChatUIMessage,
  ChatUIMessagePart,
  PendingStreams,
  UploadProgress,
  UploadStatus,
} from "./types";
import { uploadMessageFiles } from "./upload";
import { dtoToUIMessage, partitionSessionMessages } from "./utils";

/** Upload result shape (has object_key for Create Document only). */
interface UploadAttachment {
  object_key: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

async function runEnsureDocumentsReady(
  attachments: UploadAttachment[],
  profile: { projId?: string } | null,
  userId: string | undefined,
  setUploadStatus: (s: UploadStatus) => void,
  setUploadError: (e: string | null) => void
): Promise<
  | {
      ok: true;
      attachmentsWithDriveId: {
        drive_item_id?: string;
        filename?: string;
        size?: number;
        mimeType?: string;
      }[];
    }
  | { ok: false }
> {
  if (attachments.length === 0) {
    return { ok: true, attachmentsWithDriveId: [] };
  }
  const projectId = profile?.projId;
  if (!projectId?.trim()) {
    setUploadError("Arena profile or project is missing");
    return { ok: false };
  }
  const result = await ensureDocumentsReady({
    userId: userId ?? "",
    projectId,
    attachments: attachments.map((a) => ({
      object_key: a.object_key,
      filename: a.filename,
    })),
    setUploadStatus,
  });
  if (!result.ok) {
    setUploadError(result.error);
    return { ok: false };
  }
  const attachmentsWithDriveId = attachments.map((a, i) => ({
    drive_item_id: result.driveItemIds[i],
    filename: a.filename,
    size: a.size,
    mimeType: a.mimeType,
  }));
  return { ok: true, attachmentsWithDriveId };
}

export function useChatSession() {
  const pathname = usePathname();
  const router = useRouter();
  const sessionId = sessionIdFromPathname(pathname);
  const providers = getProviders();
  const defaultProviderId = providers[0]?.providerId;
  const [providerId, setProviderId] = useState<string>(defaultProviderId);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const getModelIdRef = useRef<() => string>(() => defaultProviderId);
  const currentProvider = useMemo(
    () => providers.find((p) => p.providerId === providerId),
    [providers, providerId]
  );
  useEffect(() => {
    getModelIdRef.current = () => providerId;
  }, [providerId]);

  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pendingStreams, setPendingStreams] = useState<PendingStreams | null>(
    null
  );

  const memorylakeProfile = useMemorylakeProfile();
  const memorylakeProfileRef = useRef(memorylakeProfile);
  useEffect(() => {
    memorylakeProfileRef.current = memorylakeProfile;
  }, [memorylakeProfile]);

  const { user, profile } = useProfile();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Transport is stable; modelId is read at send time via getter (useChat may not update when transport prop changes).
  const transports = useMemo(() => {
    return AGENT_IDS.map(
      // eslint-disable-next-line react-hooks/refs
      (agentId) =>
        new DefaultChatTransport({
          api: `${getBasePath()}/api/chat`,
          prepareSendMessagesRequest: ({ id, messages, body }) => {
            const baseBody = {
              ...body,
              id: sessionId ?? id,
              messages,
              agentId,
              modelId: getModelIdRef.current(),
            };
            const profile =
              agentId === "memorylake"
                ? memorylakeProfileRef.current
                : undefined;
            return {
              body: profile
                ? { ...baseBody, memorylakeProfile: profile }
                : baseBody,
              headers: { "X-User-ID": userRef.current?.id ?? "" },
            };
          },
        })
    );
  }, [sessionId]);

  const chat0 = useChat({
    id: sessionId ? `${sessionId}-memorylake` : undefined,
    transport: transports[0],
  });
  const chat1 = useChat({
    id: sessionId ? `${sessionId}-${AGENT_IDS[1]}` : undefined,
    transport: transports[1],
  });
  const chat2 = useChat({
    id: sessionId ? `${sessionId}-${AGENT_IDS[2]}` : undefined,
    transport: transports[2],
  });

  const chats = useMemo(() => [chat0, chat1, chat2], [chat0, chat1, chat2]);

  const setMessagesRefs = useRef([
    chat0.setMessages,
    chat1.setMessages,
    chat2.setMessages,
  ]);
  const sendMessageRefs = useRef([
    chat0.sendMessage,
    chat1.sendMessage,
    chat2.sendMessage,
  ]);
  useEffect(() => {
    setMessagesRefs.current[0] = chat0.setMessages;
    setMessagesRefs.current[1] = chat1.setMessages;
    setMessagesRefs.current[2] = chat2.setMessages;
    sendMessageRefs.current[0] = chat0.sendMessage;
    sendMessageRefs.current[1] = chat1.sendMessage;
    sendMessageRefs.current[2] = chat2.sendMessage;
  }, [
    chat0.setMessages,
    chat1.setMessages,
    chat2.setMessages,
    chat0.sendMessage,
    chat1.sendMessage,
    chat2.sendMessage,
  ]);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    currentFileIndex: 0,
    totalFiles: 0,
    loaded: 0,
    total: 0,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      const setters = setMessagesRefs.current;
      setters[0]([]);
      setters[1]([]);
      setters[2]([]);
      queueMicrotask(() => setMessagesLoading(false));
      return;
    }
    queueMicrotask(() => setMessagesLoading(true));
    getSessionMessages(sessionId)
      .then((list) => {
        const partitioned = partitionSessionMessages(list, AGENT_IDS);
        const uiPartitions = partitioned.map((p) => p.map(dtoToUIMessage));
        const setters = setMessagesRefs.current;
        setters[0](uiPartitions[0] as Parameters<(typeof setters)[0]>[0]);
        setters[1](uiPartitions[1] as Parameters<(typeof setters)[0]>[0]);
        setters[2](uiPartitions[2] as Parameters<(typeof setters)[0]>[0]);
      })
      .catch(() => {
        const setters = setMessagesRefs.current;
        setters[0]([]);
        setters[1]([]);
        setters[2]([]);
      })
      .finally(() => setMessagesLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || messagesLoading) {
      return;
    }
    const key = `${PENDING_STREAMS_KEY}-${sessionId}`;
    try {
      const raw =
        typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
      if (!raw) {
        return;
      }
      const pending = JSON.parse(raw) as PendingStreams;
      sessionStorage.removeItem(key);
      queueMicrotask(() => {
        setProviderId(pending.providerId);
        setPendingStreams(pending);
      });
    } catch {
      sessionStorage.removeItem(key);
    }
  }, [sessionId, messagesLoading]);

  useEffect(() => {
    if (!(pendingStreams && sessionId)) {
      return;
    }
    const text = pendingStreams.text;
    const attachments = pendingStreams.attachments;
    const run = async () => {
      const { userMessageId } = await saveUserMessage(
        sessionId,
        text,
        attachments
      );
      const textPart: ChatUIMessagePart = { type: "text", text };
      const fileRefParts: ChatUIMessagePart[] = (attachments ?? []).map(
        (a) => ({
          type: "data-file-ref",
          data: {
            drive_item_id: a.drive_item_id,
            filename: a.filename,
            size: a.size,
            mimeType: a.mimeType,
          },
        })
      );
      const userMsg: ChatUIMessage = {
        id: userMessageId,
        role: "user",
        parts: [textPart, ...fileRefParts],
      };
      const setters = setMessagesRefs.current;
      const senders = sendMessageRefs.current;
      for (let i = 0; i < 3; i++) {
        setters[i]((prev) => [...prev, userMsg] as typeof prev);
      }
      for (let i = 0; i < 3; i++) {
        senders[i]();
      }
      setPendingStreams(null);
    };
    run();
  }, [pendingStreams, sessionId]);

  const status = useMemo((): "ready" | "streaming" | "submitted" => {
    if (chats.some((c) => c.status === "streaming")) {
      return "streaming";
    }
    if (chats.some((c) => c.status === "submitted")) {
      return "submitted";
    }
    return "ready";
  }, [chats]);

  const error = useMemo(
    () => chats.map((c) => c.error).find((e) => e != null),
    [chats]
  );

  const stopAll = useCallback(() => {
    for (const c of chats) {
      c.stop();
    }
  }, [chats]);

  const messagesByAgent = useMemo(
    () => [chat0.messages, chat1.messages, chat2.messages] as const,
    [chat0.messages, chat1.messages, chat2.messages]
  );

  const rounds = useMemo(() => {
    const first = chat0.messages as ChatUIMessage[];
    const result: {
      user: ChatUIMessage;
      assistants: (ChatUIMessage | null)[];
    }[] = [];
    for (let i = 0; i < first.length; i++) {
      const msg = first[i];
      if (msg.role !== "user") {
        continue;
      }
      const user = msg;
      const asst0 =
        first[i + 1]?.role === "assistant"
          ? (first[i + 1] as ChatUIMessage)
          : null;
      const idx1 = (chat1.messages as ChatUIMessage[]).findIndex(
        (m) => m.id === user.id
      );
      const asst1 =
        idx1 >= 0 &&
        (chat1.messages[idx1 + 1] as ChatUIMessage)?.role === "assistant"
          ? (chat1.messages[idx1 + 1] as ChatUIMessage)
          : null;
      const idx2 = (chat2.messages as ChatUIMessage[]).findIndex(
        (m) => m.id === user.id
      );
      const asst2 =
        idx2 >= 0 &&
        (chat2.messages[idx2 + 1] as ChatUIMessage)?.role === "assistant"
          ? (chat2.messages[idx2 + 1] as ChatUIMessage)
          : null;
      result.push({ user, assistants: [asst0, asst1, asst2] });
    }
    return result;
  }, [chat0.messages, chat1.messages, chat2.messages]);

  const hasAnyMessages = useMemo(
    () => messagesByAgent.some((m) => m.length > 0),
    [messagesByAgent]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const { text, files: messageFiles } = message;
      setUploadError(null);

      const attachments = await uploadMessageFiles(
        messageFiles ?? [],
        setUploadStatus,
        setUploadProgress,
        setUploadError,
        user?.id
      );
      if (attachments === null) {
        throw new Error("Upload failed");
      }

      const documentsResult = await runEnsureDocumentsReady(
        attachments,
        profile,
        user?.id,
        setUploadStatus,
        setUploadError
      );
      if (!documentsResult.ok) {
        throw new Error("Documents not ready");
      }
      const { attachmentsWithDriveId } = documentsResult;

      if (!sessionId) {
        const { id } = await createSession();
        const key = `${PENDING_STREAMS_KEY}-${id}`;
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              providerId,
              text,
              ...(attachmentsWithDriveId.length
                ? { attachments: attachmentsWithDriveId }
                : {}),
            } satisfies PendingStreams)
          );
        } catch {
          sessionStorage.removeItem(key);
        }
        router.push(`${SESSION_PATH_PREFIX}${id}`);
        return;
      }

      const { userMessageId } = await saveUserMessage(
        sessionId,
        text,
        attachmentsWithDriveId.length ? attachmentsWithDriveId : undefined
      );
      const textPart: ChatUIMessagePart = { type: "text", text };
      const fileRefParts: ChatUIMessagePart[] = attachmentsWithDriveId.map(
        (a) => ({
          type: "data-file-ref",
          data: {
            drive_item_id: a.drive_item_id,
            filename: a.filename,
            size: a.size,
            mimeType: a.mimeType,
          },
        })
      );
      const userMsg: ChatUIMessage = {
        id: userMessageId,
        role: "user",
        parts: [textPart, ...fileRefParts],
      };
      for (const c of chats) {
        c.setMessages((prev) => [...prev, userMsg] as typeof prev);
      }
      for (const c of chats) {
        c.sendMessage();
      }
      setUploadStatus("idle");
    },
    [sessionId, providerId, router, chats, user, profile]
  );

  return {
    sessionId,
    messagesLoading,
    hasAnyMessages,
    rounds,
    chats,
    status,
    error,
    stopAll,
    uploadStatus,
    uploadProgress,
    uploadError,
    handleSubmit,
    providerId,
    setProviderId,
    modelSelectorOpen,
    setModelSelectorOpen,
    currentProvider,
    providers,
  };
}
