"use client";

import {
  Conversation,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatContent } from "./chat-content";
import { ChatInput } from "./chat-input";
import { useChatSession } from "./use-chat-session";

export function ChatArea() {
  const {
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
  } = useChatSession();

  return (
    <div className="flex h-lvh flex-col">
      <Conversation className="[&_div]:overflow-y-auto">
        {messagesLoading && (
          <ConversationEmptyState
            description="Loading conversation…"
            title="Loading"
          />
        )}
        {!(messagesLoading || hasAnyMessages) && (
          <ConversationEmptyState
            description="Choose an LLM and send a message to compare three agents."
            title="Start a conversation"
          />
        )}
        {!messagesLoading && hasAnyMessages && (
          <ChatContent chats={chats} rounds={rounds} />
        )}
        <ConversationScrollButton />
      </Conversation>

      <ChatInput
        currentProvider={currentProvider}
        error={error}
        handleSubmit={handleSubmit}
        modelSelectorOpen={modelSelectorOpen}
        providerId={providerId}
        providers={providers}
        setModelSelectorOpen={setModelSelectorOpen}
        setProviderId={setProviderId}
        status={status}
        stopAll={stopAll}
        uploadError={uploadError}
        uploadProgress={uploadProgress}
        uploadStatus={uploadStatus}
      />
    </div>
  );
}
