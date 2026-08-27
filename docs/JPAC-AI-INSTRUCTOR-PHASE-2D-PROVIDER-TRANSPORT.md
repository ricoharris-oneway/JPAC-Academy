# JPAC AI Instructor Phase 2D: Provider Transport Behind a Disabled Server Flag

## Status

Phase 2D adds native-fetch transport for future live AI. It does not enable live AI, add credentials, connect the current Coach UI, persist conversations, or change any academic record. The server kill switch defaults to off, and Phase 1 deterministic JPAC Coach remains the production experience.

## Provider paths

### Primary: Vercel AI Gateway

When separately configured and enabled, the primary transport sends a non-streaming Responses API request to Vercel AI Gateway. It requires `JPAC_AI_PROVIDER=vercel_ai_gateway`, a current provider/model identifier in `JPAC_AI_MODEL`, and a server-only `AI_GATEWAY_API_KEY`.

### Backup: direct OpenAI

The backup transport uses the OpenAI Responses API with `JPAC_AI_PROVIDER=openai`, a separately approved model identifier, and a server-only `OPENAI_API_KEY`. It uses the same prompt, strict output schema, timeout, and fallback boundary as the gateway path.

No model identifier or credential is committed. Provider and model availability must be verified against current official documentation before a pilot.

## Server environment

- `JPAC_AI_SERVER_ENABLED=false` — authoritative server kill switch; defaults to disabled.
- `JPAC_AI_PROVIDER=none` — accepts only `none`, `vercel_ai_gateway`, or `openai`.
- `JPAC_AI_MODEL` — server-selected model identifier; unset by default.
- `AI_GATEWAY_API_KEY` — server-only gateway credential; not added by this release.
- `OPENAI_API_KEY` — server-only direct-provider credential; not added by this release.
- `JPAC_AI_REQUEST_TIMEOUT_MS=8000` — clamped between 1 and 15 seconds.
- `JPAC_AI_MAX_PROMPT_CHARS=6000` — clamped between 1,000 and 12,000 characters.

`VITE_JPAC_LIVE_AI_ENABLED` remains an optional client-visible UX flag only. It is not an authorization boundary and no current UI reads it to call the provider endpoint.

## Transport safeguards

- The native transport repeats the server-enabled and complete-configuration checks before `fetch`.
- Requests set `store: false` and `stream: false`.
- No tools, function calls, files, images, audio, video, or media are supplied.
- An abort signal and bounded timeout stop slow requests.
- Provider errors, non-success responses, malformed JSON, missing output, and schema failures return deterministic fallback.
- Secrets are read server-side, used only in the authorization header, and never logged or returned.
- Output must match the strict advisory JSON schema and is validated again locally.

## Fallback behavior

The Phase 1 advisory response is returned when the server flag is disabled, provider is `none` or invalid, a key/model is missing, the request times out, a provider fails, JSON cannot be parsed, or output violates policy. Raw provider errors never reach the client.

## No UI or database wiring

No current Coach surface imports or calls `liveCoachClient`. This release adds no Supabase client, SQL, RPC, database read/write, service-role credential, storage operation, chat UI, streaming, persistence, or conversation history.

The provider has no way to award XP, update progress or mastery, issue certificates, change enrollments, create submissions, alter review status, publish curriculum, or handle media. Teacher review remains required.

## Rollout gate

Do not enable `JPAC_AI_SERVER_ENABLED` in production during Phase 2D. A later pilot requires explicit approval, verified server-side session authentication, object-level authorization, age-safety/privacy review, rate and budget controls, current model verification, internal test students, and production visual testing. The first proposed pilot mode remains `lesson_explanation` using authorized published content only.

## Rollback

Keep or restore `JPAC_AI_SERVER_ENABLED=false`, then revert the focused Phase 2D commit if necessary. The deterministic Coach requires no database rollback or data repair.
