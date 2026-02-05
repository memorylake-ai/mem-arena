"use client";

import Image from "next/image";
import { ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { AGENT_IDS } from "@/lib/agents";
import { AgentCellContent } from "./agent-cell";
import { AGENT_ICON_PATHS, AGENT_LABELS } from "./constants";
import { FileDisplay } from "./file-display";
import type { ChatUIMessage, ChatUIMessageDataFileRefPart } from "./types";

export interface ChatContentProps {
  rounds: {
    user: ChatUIMessage;
    assistants: (ChatUIMessage | null)[];
  }[];
  chats: {
    messages: unknown[];
    status: string;
    error: unknown;
  }[];
}

export function ChatContent({ rounds, chats }: ChatContentProps) {
  return (
    <ConversationContent>
      {rounds.map((round) => (
        <div className="grid gap-4" key={round.user.id}>
          <Message from="user">
            <MessageContent>
              <div className="flex flex-col gap-2">
                {round.user.parts
                  .filter(
                    (p): p is { type: "text"; text: string } =>
                      p.type === "text"
                  )
                  .map((p) => p.text)
                  .join("") && (
                  <span>
                    {round.user.parts
                      .filter(
                        (p): p is { type: "text"; text: string } =>
                          p.type === "text"
                      )
                      .map((p) => p.text)
                      .join("")}
                  </span>
                )}
                {round.user.parts.filter((p) => p.type === "data-file-ref")
                  .length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {round.user.parts
                      .filter(
                        (p): p is ChatUIMessageDataFileRefPart =>
                          p.type === "data-file-ref"
                      )
                      .map((p, i) => (
                        <FileDisplay
                          className="bg-background"
                          filename={p.data.filename ?? "File"}
                          key={p.data.filename ?? i}
                          mimeType={p.data.mimeType}
                          size={p.data.size}
                        />
                      ))}
                  </div>
                )}
              </div>
            </MessageContent>
          </Message>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {AGENT_IDS.map((aid, idx) => {
              const assistant = round.assistants[idx];
              const isLastRound = round === rounds.at(-1);
              const chatStatus = chats[idx].status;
              const chatError = chats[idx].error;
              const waitingFirstToken =
                !assistant &&
                (chatStatus === "streaming" || chatStatus === "submitted");
              const showStreamError =
                !assistant && isLastRound && chatError != null;
              let errorText: string | null = null;
              if (
                showStreamError &&
                chatError &&
                typeof chatError === "object" &&
                "message" in chatError
              ) {
                errorText = (chatError as { message: string }).message;
              } else if (assistant?.metadata?.isError) {
                errorText =
                  assistant.parts
                    .filter(
                      (p): p is { type: "text"; text: string } =>
                        p.type === "text"
                    )
                    .map((p) => p.text)
                    .join("") || "";
              }

              return (
                <div
                  className="flex flex-col rounded-lg border border-border bg-muted/30"
                  key={aid}
                >
                  <div className="flex items-center gap-1 border-b px-3 py-2 font-medium text-xs">
                    <Image
                      alt=""
                      className="dark:invert"
                      height={16}
                      src={AGENT_ICON_PATHS[aid]}
                      width={16}
                    />
                    {AGENT_LABELS[aid]}
                  </div>
                  <div className="px-3 py-2">
                    <AgentCellContent
                      assistant={assistant ?? null}
                      errorText={errorText}
                      waitingFirstToken={waitingFirstToken}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </ConversationContent>
  );
}
