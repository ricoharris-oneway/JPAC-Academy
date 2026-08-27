import type { AIInstructorConfig } from './ai-instructor-config.ts';
import { isProviderConfigured } from './ai-instructor-config.ts';
import type { AIInstructorPrompt } from './ai-instructor-prompt.ts';
import type { AIInstructorAdvisoryResponse } from './ai-instructor-output.ts';
import {
  createPhase1Fallback,
  createProviderAdvisory,
  validateAIInstructorProviderOutput,
} from './ai-instructor-output.ts';

export type AIInstructorProviderExecutor = (
  config: Readonly<AIInstructorConfig>,
  prompt: Readonly<AIInstructorPrompt>,
) => Promise<unknown>;

export type AIInstructorProviderResult = {
  response: AIInstructorAdvisoryResponse;
  fallbackReason: 'disabled' | 'missing_config' | 'transport_unavailable' | 'timeout' | 'provider_error' | 'invalid_output' | null;
};

const unavailableTransport: AIInstructorProviderExecutor = async () => null;

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
  executor: AIInstructorProviderExecutor = unavailableTransport,
): Promise<AIInstructorProviderResult> {
  const fallback = (fallbackReason: NonNullable<AIInstructorProviderResult['fallbackReason']>): AIInstructorProviderResult => ({
    response: createPhase1Fallback(prompt.mode),
    fallbackReason,
  });

  if (!config.liveAIEnabled) return fallback('disabled');
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
