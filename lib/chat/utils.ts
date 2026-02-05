import type { ChatMessagePartOutput } from "@/lib/chat/schema";

/** Concatenate text from parts with type "text" and string text (for API body and onFinish). */
export function extractTextFromMessage(parts: ChatMessagePartOutput[]): string {
  return (parts ?? [])
    .filter(
      (p): p is { type: string; text: string } =>
        p.type === "text" && typeof p.text === "string"
    )
    .map((p) => p.text)
    .join("");
}
