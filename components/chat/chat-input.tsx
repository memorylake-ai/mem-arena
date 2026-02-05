"use client";

import type { ChatStatus } from "ai";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Progress } from "@/components/ui/progress";
import type { ProviderOption } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AddFilesTrigger, ChatFileList } from "./input-parts";
import { ChatModelSelect } from "./model-select";
import type { UploadProgress, UploadStatus } from "./types";

export interface ChatInputProps {
  error: { message: string } | null | undefined;
  uploadError: string | null;
  uploadStatus: UploadStatus;
  uploadProgress: UploadProgress;
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  status: ChatStatus;
  stopAll: () => void;
  providerId: string;
  setProviderId: (id: string) => void;
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;
  currentProvider: ProviderOption | undefined;
  providers: ProviderOption[];
}

export function ChatInput({
  error,
  uploadError,
  uploadStatus,
  uploadProgress,
  handleSubmit,
  status,
  stopAll,
  providerId,
  setProviderId,
  modelSelectorOpen,
  setModelSelectorOpen,
  currentProvider,
  providers,
}: ChatInputProps) {
  return (
    <div className="border-border border-t p-3">
      {error && (
        <p className="mb-2 text-destructive text-sm">{error.message}</p>
      )}
      {uploadError && (
        <p className="mb-2 text-destructive text-sm">{uploadError}</p>
      )}
      {uploadStatus === "uploading" && (
        <div className="mb-2 flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            Uploading file {uploadProgress.currentFileIndex + 1} /{" "}
            {uploadProgress.totalFiles},{" "}
            {(uploadProgress.loaded / 1024).toFixed(1)} /{" "}
            {(uploadProgress.total / 1024).toFixed(1)} KB
          </p>
          <Progress
            className="h-1.5"
            value={
              uploadProgress.total
                ? (uploadProgress.loaded / uploadProgress.total) * 100
                : 0
            }
          />
        </div>
      )}
      {uploadStatus === "processing" && (
        <p className="mb-2 text-muted-foreground text-xs">
          Processing document…
        </p>
      )}
      <PromptInput className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <PromptInputHeader className="py-0">
          <ChatFileList />
        </PromptInputHeader>
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputFooter>
          <PromptInputTools>
            <AddFilesTrigger />
            <ChatModelSelect
              currentProvider={currentProvider}
              onOpenChange={setModelSelectorOpen}
              open={modelSelectorOpen}
              providerId={providerId}
              providers={providers}
              setProviderId={setProviderId}
            />
          </PromptInputTools>
          <PromptInputSubmit
            className={cn(
              (status === "streaming" ||
                status === "submitted" ||
                uploadStatus === "uploading" ||
                uploadStatus === "processing") &&
                "opacity-70"
            )}
            disabled={
              uploadStatus === "uploading" || uploadStatus === "processing"
            }
            onStop={stopAll}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
