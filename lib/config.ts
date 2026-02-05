export interface ProviderOption {
  /** Model id used by API (e.g. gpt-5.2, claude-sonnet-4-5-20250929). */
  providerId: string;
  displayName: string;
  /** Group label for select dropdown (e.g. Anthropic, OpenAI). */
  group: string;
  /** Provider key for ModelSelectorLogo (e.g. anthropic, openai). */
  logoProvider: string;
}

export function getProviders(): ProviderOption[] {
  return [
    {
      providerId: "claude-haiku-4-5-20251001",
      displayName: "Claude 4.5 Haiku",
      group: "Anthropic",
      logoProvider: "anthropic",
    },
    {
      providerId: "claude-sonnet-4-5-20250929",
      displayName: "Claude 4.5 Sonnet",
      group: "Anthropic",
      logoProvider: "anthropic",
    },
    {
      providerId: "gpt-5-mini",
      displayName: "GPT-5 Mini",
      group: "OpenAI",
      logoProvider: "openai",
    },
    {
      providerId: "gpt-5.2",
      displayName: "GPT-5.2",
      group: "OpenAI",
      logoProvider: "openai",
    },
  ];
}

export const MODEL_IDS = [
  "gpt-5.2",
  "gpt-5-mini",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const OPENAI_MODELS: ModelId[] = ["gpt-5.2", "gpt-5-mini"];
export const ANTHROPIC_MODELS: ModelId[] = [
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
];

export function isOpenAIModel(
  modelId: string
): modelId is (typeof OPENAI_MODELS)[number] {
  return OPENAI_MODELS.includes(modelId as (typeof OPENAI_MODELS)[number]);
}

export function isAnthropicModel(
  modelId: string
): modelId is (typeof ANTHROPIC_MODELS)[number] {
  return ANTHROPIC_MODELS.includes(
    modelId as (typeof ANTHROPIC_MODELS)[number]
  );
}

export function isSupportedModelId(value: string): value is ModelId {
  return MODEL_IDS.includes(value as ModelId);
}

/**
 * Provider identifier for file-URL support rules (matches mem0/createMem0 provider).
 */
export type FileUrlProvider = "openai" | "anthropic";

/**
 * Whether the given provider supports file parts via URL for the given media type.
 * Rules are derived from AI SDK converter implementations:
 * - OpenAI: @ai-sdk/openai convert-to-openai-chat-messages.ts — image/* uses URL or base64;
 *   audio/* and application/pdf throw UnsupportedFunctionalityError for URL (base64 only).
 * - Anthropic: @ai-sdk/anthropic convert-to-anthropic-messages-prompt.ts — image/*,
 *   application/pdf, and text/plain accept source.type 'url' or base64.
 */
export function providerSupportsFileUrl(
  provider: FileUrlProvider,
  mediaType: string
): boolean {
  const mt = mediaType.toLowerCase().trim();
  if (provider === "openai") {
    return mt.startsWith("image/");
  }
  if (provider === "anthropic") {
    return (
      mt.startsWith("image/") || mt === "application/pdf" || mt === "text/plain"
    );
  }
  return false;
}

/** Resolve provider from modelId for file URL support (matches mem0 getMem0Model). */
export function getFileUrlProvider(modelId: string): FileUrlProvider {
  return isOpenAIModel(modelId) ? "openai" : "anthropic";
}

/**
 * Whether the given provider supports this file media type at all (URL or base64).
 * Derived from AI SDK: OpenAI accepts image/*, audio/wav|mp3|mpeg, application/pdf;
 * Anthropic accepts image/*, application/pdf, text/plain. All other types (e.g. text/csv,
 * text/markdown, Excel) throw UnsupportedFunctionalityError.
 */
export function providerSupportsFileType(
  provider: FileUrlProvider,
  mediaType: string
): boolean {
  const mt = mediaType.toLowerCase().trim();
  if (provider === "openai") {
    if (mt.startsWith("image/")) {
      return true;
    }
    if (mt.startsWith("audio/")) {
      return mt === "audio/wav" || mt === "audio/mp3" || mt === "audio/mpeg";
    }
    return mt === "application/pdf";
  }
  if (provider === "anthropic") {
    return (
      mt.startsWith("image/") || mt === "application/pdf" || mt === "text/plain"
    );
  }
  return false;
}
