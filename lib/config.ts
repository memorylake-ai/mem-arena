export interface ProviderOption {
  /** Model id used by API (e.g. gpt-5.2, claude-4.5-sonnet). */
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
  "claude-4.5-sonnet",
  "claude-4.5-haiku",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const OPENAI_MODELS: ModelId[] = ["gpt-5.2", "gpt-5-mini"];
export const ANTHROPIC_MODELS: ModelId[] = [
  "claude-4.5-sonnet",
  "claude-4.5-haiku",
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
