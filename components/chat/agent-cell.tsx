"use client";

import { Loader2 } from "lucide-react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { ChatUIMessage } from "./types";

export interface AgentCellContentProps {
  errorText: string | null;
  assistant: ChatUIMessage | null;
  waitingFirstToken: boolean;
}

export function AgentCellContent({
  errorText,
  assistant,
  waitingFirstToken,
}: AgentCellContentProps) {
  if (errorText) {
    return (
      <div className="text-sm" role="alert">
        <span>{errorText}</span>
      </div>
    );
  }
  if (assistant && !assistant.metadata?.isError) {
    return (
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            {assistant.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text"
              )
              .map((p) => p.text)
              .join("")}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }
  if (waitingFirstToken) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        <span>Waiting for response…</span>
      </div>
    );
  }
  return <div className="text-muted-foreground text-sm">—</div>;
}
