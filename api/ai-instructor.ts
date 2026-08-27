import { isAIInstructorMode } from './_lib/ai-instructor-policy.ts';
import { createAIInstructorError, createPhase1Fallback } from './_lib/ai-instructor-output.ts';

type HeaderValue = string | string[] | undefined;
type APIRequest = {
  method?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
};
type APIResponse = {
  status(code: number): APIResponse;
  json(payload: unknown): void;
  setHeader?(name: string, value: string): void;
};

const MAX_REQUEST_CHARACTERS = 2_048;

function firstHeader(value: HeaderValue): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

type ParsedRequestBody =
  | { body: Record<string, unknown>; error: null }
  | { body: null; error: 'invalid_request' | 'request_too_large' };

function requestBody(value: unknown): ParsedRequestBody {
  let parsed = value;
  if (typeof parsed === 'string') {
    if (parsed.length > MAX_REQUEST_CHARACTERS) return { body: null, error: 'request_too_large' };
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return { body: null, error: 'invalid_request' };
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { body: null, error: 'invalid_request' };
  }
  const body = parsed as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'mode') return { body: null, error: 'invalid_request' };
  try {
    if (JSON.stringify(body).length > MAX_REQUEST_CHARACTERS) return { body: null, error: 'request_too_large' };
  } catch {
    return { body: null, error: 'invalid_request' };
  }
  return { body, error: null };
}

export default function handler(req: APIRequest, res: APIResponse): void {
  res.setHeader?.('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json(createAIInstructorError('method_not_allowed', 'Use POST for JPAC Coach readiness requests.'));
    return;
  }

  // Phase 2A checks only that an authenticated caller supplied a bearer token.
  // Server-side token verification and object authorization must be added before any live provider is connected.
  const authorization = firstHeader(req.headers.authorization);
  if (!authorization.startsWith('Bearer ') || authorization.slice(7).trim().length === 0) {
    res.status(401).json(createAIInstructorError('authentication_required', 'Sign in before requesting JPAC Coach guidance.'));
    return;
  }

  const parsed = requestBody(req.body);
  if (parsed.error === 'request_too_large') {
    res.status(413).json(createAIInstructorError('request_too_large', 'The JPAC Coach readiness request is too large.'));
    return;
  }
  if (parsed.error || !isAIInstructorMode(parsed.body.mode)) {
    res.status(400).json(createAIInstructorError('invalid_request', 'Choose an approved JPAC Coach guidance mode.'));
    return;
  }

  // Intentionally no provider branch exists in Phase 2A. The environment flag is not
  // sufficient to enable live AI without a separately reviewed authentication/provider implementation.
  res.status(200).json(createPhase1Fallback(parsed.body.mode));
}
