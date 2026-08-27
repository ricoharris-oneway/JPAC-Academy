import type { AIInstructorConfig } from './ai-instructor-config.js';
import { isProviderConfigured } from './ai-instructor-config.js';
import type { AIInstructorPrompt } from './ai-instructor-prompt.js';
import type { AIInstructorAdvisoryResponse } from './ai-instructor-output.js';
import {
  createPhase1Fallback,
  createProviderAdvisory,
  validateAIInstructorProviderOutput,
} from './ai-instructor-output.js';

export type AIInstructorProviderExecutor = (
  config: Readonly<AIInstructorConfig>,
  prompt: Readonly<AIInstructorPrompt>,
) => Promise<unknown>;

export type AIInstructorProviderResult = {
  response: AIInstructorAdvisoryResponse;
  fallbackReason: 'disabled' | 'missing_config' | 'transport_unavailable' | 'timeout' | 'provider_error' | 'invalid_output' | null;
};

const unavailableTransport: AIInstructorProviderExecutor = async () => null;

type FetchImplementation = (input: string, init: RequestInit) => Promise<Response>;

const PROVIDER_ENDPOINTS: Record<Exclude<AIInstructorConfig['provider'], 'none'>, string> = {
  vercel_ai_gateway: 'https://ai-gateway.vercel.sh/v1/responses',
  openai: 'https://api.openai.com/v1/responses',
};

const ADVISORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    guidance: { type: 'string' },
    nextStep: { type: 'string' },
    advisoryOnly: { type: 'boolean', const: true },
    teacherReviewRequired: { type: 'boolean', const: true },
    completenessCheckOnly: { type: 'boolean', const: true },
  },
  required: [
    'headline', 'guidance', 'nextStep', 'advisoryOnly', 'teacherReviewRequired', 'completenessCheckOnly',
  ],
} as const;

function responseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;
  if (!Array.isArray(record.output)) return '';
  for (const item of record.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') return text;
    }
  }
  return '';
}

export function createNativeProviderExecutor(
  fetchImplementation: FetchImplementation = globalThis.fetch,
): AIInstructorProviderExecutor {
  return async (config, prompt) => {
    // This guard is deliberately repeated inside the executable transport. A caller
    // cannot bypass the server kill switch by invoking the adapter directly.
    if (!config.serverEnabled || !isProviderConfigured(config) || config.provider === 'none') return null;

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const response = await fetchImplementation(PROVIDER_ENDPOINTS[config.provider], {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.providerCredential}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          instructions: prompt.system,
          input: prompt.evidence || 'Provide safe generic JPAC Coach guidance for the selected mode.',
          store: false,
          stream: false,
          max_output_tokens: 700,
          tools: [],
          text: {
            format: {
              type: 'json_schema',
              name: 'jpac_ai_instructor_advisory',
              strict: true,
              schema: ADVISORY_SCHEMA,
            },
          },
        }),
      });
      if (!response.ok) throw new Error('provider_request_failed');
      const rawText = await response.text();
      if (rawText.length > 32_000) return null;
      let payload: unknown;
      try {
        payload = JSON.parse(rawText) as unknown;
      } catch {
        return null;
      }
      const text = responseText(payload);
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return null;
      }
    } finally {
      clearTimeout(abortTimer);
    }
  };
}

const nativeProviderTransport = createNativeProviderExecutor();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('provider_timeout')), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function requestAIInstructorProvider(
  config: Readonly<AIInstructorConfig>,
  prompt: Readonly<AIInstructorPrompt>,
  executor: AIInstructorProviderExecutor = nativeProviderTransport,
): Promise<AIInstructorProviderResult> {
  const fallback = (fallbackReason: NonNullable<AIInstructorProviderResult['fallbackReason']>): AIInstructorProviderResult => ({
    response: createPhase1Fallback(prompt.mode),
    fallbackReason,
  });

  if (!config.serverEnabled) return fallback('disabled');
  if (!isProviderConfigured(config)) return fallback('missing_config');
  if (executor === unavailableTransport) return fallback('transport_unavailable');

  try {
    const raw = await withTimeout(executor(config, prompt), config.requestTimeoutMs);
    const output = validateAIInstructorProviderOutput(raw);
    if (!output) return fallback('invalid_output');
    return { response: createProviderAdvisory(prompt.mode, output), fallbackReason: null };
  } catch (error) {
    return fallback(error instanceof Error && error.message === 'provider_timeout' ? 'timeout' : 'provider_error');
  }
}
