"use client";

import { Paperclip } from "lucide-react";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { Button } from "../ui/button";
import { FileDisplay } from "./file-display";

/** File list in input header (must be rendered inside PromptInput). */
export function ChatFileList() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {attachments.files.map((f) => (
        <span className="shrink-0" key={f.id}>
          <FileDisplay
            filename={f.filename ?? "File"}
            mimeType={f.mediaType}
            onRemove={() => attachments.remove(f.id)}
            size={f.size}
          />
        </span>
      ))}
    </div>
  );
}

/** Add-files trigger button (must be rendered inside PromptInput). */
export function AddFilesTrigger() {
  const attachments = usePromptInputAttachments();
  return (
    <Button
      aria-label="Add files"
      onClick={() => attachments.openFileDialog()}
      size="icon"
      type="button"
      variant="outline"
    >
      <Paperclip />
    </Button>
  );
}
