# JPAC AI Instructor Phase 2C: Provider Wiring Behind a Disabled Flag

## Status

Phase 2C adds a server-side provider boundary, configuration parser, prompt builder, strict output validation, and fallback tests. It does not connect a provider. Live AI remains disabled by default and no current Coach surface imports or calls `liveCoachClient`.

## Added architecture

- `api/_lib/ai-instructor-config.ts` reads bounded server configuration. The default provider is `none` and the default server enable flag is `false`.
- `api/_lib/ai-instructor-prompt.ts` builds mode-specific prompts from bounded evidence. Student text is labeled as untrusted evidence, and only explicitly published curriculum is accepted.
- `api/_lib/ai-instructor-provider.ts` defines the provider adapter contract, timeout behavior, and deterministic fallback reasons.
- `api/_lib/ai-instructor-output.ts` validates a strict advisory DTO and rejects protected fields, unknown fields, protected-action language, and oversized output.
- `api/ai-instructor.ts` remains POST-only, retains bearer and request guards, and delegates to the adapter only after server-side configuration permits it.

## Provider state

The `none`, `vercel_ai_gateway`, and `openai` provider names are recognized by server configuration. No executable transport is supplied in Phase 2C. The default adapter is a no-op that returns the Phase 1 deterministic fallback even if configuration is incomplete or accidentally enabled.

Adding native `fetch`, a provider SDK, or a credential is explicitly deferred. That later release must first replace the Phase 2A bearer-presence placeholder with verified server-side authentication and object authorization.

## Proposed server environment

- `JPAC_LIVE_AI_ENABLED=false`
- `JPAC_AI_PROVIDER=none`
- `JPAC_AI_MODEL` (unset)
- `JPAC_AI_REQUEST_TIMEOUT_MS=8000`
- `JPAC_AI_MAX_PROMPT_CHARS=6000`
- `AI_GATEWAY_API_KEY` (unset, server-only)
- `OPENAI_API_KEY` (unset, server-only)

`VITE_JPAC_LIVE_AI_ENABLED` remains a client-visible UX flag only. It cannot authorize provider execution. Server configuration makes the final decision, and server-only credentials must never use a `VITE_` prefix.

## Fallback behavior

The endpoint returns the deterministic Phase 1 advisory response when live AI is disabled, the provider is `none`, configuration is incomplete, transport is unavailable, the provider fails, the request times out, or output validation fails. Raw provider errors and credentials are never returned or logged.

## Prompt and output safety

- No full conversation history, staff-private notes, media, files, tools, function calling, streaming, or persistence.
- Student text is evidence, not instructions.
- Curriculum context must be explicitly marked published.
- Teacher review remains required.
- Output cannot contain score, grade, approval, rejection, final-decision fields, or protected mutation instructions.
- Invalid output is discarded and replaced with deterministic fallback.

## Protected systems

Phase 2C contains no database client, query, RPC, SQL, service-role usage, storage call, or academic mutation. It cannot update XP, progress, mastery, certificates, enrollments, submissions, review status, curriculum, or media.

## Future enablement gate

Provider transport must be a separate, explicitly approved release. Before it can execute, JPAC must add verified session authentication, object-level authorization, current provider documentation review, child-safety/privacy approval, rate limits, operational budgets, secret provisioning, and production kill-switch ownership. The first pilot mode remains `lesson_explanation` for approved internal test students and published lessons only.

## Rollback

Revert the focused Phase 2C commit. No database rollback or data repair is required. Phase 1 deterministic Coach behavior remains available throughout.
