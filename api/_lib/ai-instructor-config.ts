export type AIInstructorProvider = 'none' | 'vercel_ai_gateway' | 'openai';

export type AIInstructorConfig = {
  liveAIEnabled: boolean;
  provider: AIInstructorProvider;
  model: string;
  requestTimeoutMs: number;
  maxPromptCharacters: number;
  providerCredential: string;
};

type RuntimeProcess = { env?: Record<string, string | undefined> };

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_PROMPT_CHARACTERS = 6_000;

function environment(): Record<string, string | undefined> {
  return (globalThis as { process?: RuntimeProcess }).process?.env ?? {};
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function providerName(value: string | undefined): AIInstructorProvider {
  return value === 'vercel_ai_gateway' || value === 'openai' ? value : 'none';
}

export function readAIInstructorConfig(
  source: Record<string, string | undefined> = environment(),
): AIInstructorConfig {
  const provider = providerName(source.JPAC_AI_PROVIDER);
  const providerCredential = provider === 'vercel_ai_gateway'
    ? source.AI_GATEWAY_API_KEY ?? ''
    : provider === 'openai'
      ? source.OPENAI_API_KEY ?? ''
      : '';

  return {
    liveAIEnabled: source.JPAC_LIVE_AI_ENABLED === 'true',
    provider,
    model: source.JPAC_AI_MODEL?.trim() ?? '',
    requestTimeoutMs: boundedInteger(source.JPAC_AI_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 1_000, 15_000),
    maxPromptCharacters: boundedInteger(
      source.JPAC_AI_MAX_PROMPT_CHARS,
      DEFAULT_MAX_PROMPT_CHARACTERS,
      1_000,
      12_000,
    ),
    providerCredential,
  };
}

export function isProviderConfigured(config: AIInstructorConfig): boolean {
  return config.liveAIEnabled
    && config.provider !== 'none'
    && config.model.length > 0
    && config.providerCredential.length > 0;
}
