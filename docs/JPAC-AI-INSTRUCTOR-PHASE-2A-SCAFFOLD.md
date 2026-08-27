# JPAC AI Instructor Phase 2A Readiness Scaffold

## Purpose

Phase 2A prepares a narrow, server-only boundary for future live AI while preserving JPAC AI Instructor Phase 1 as the active student experience. No live provider, chat interface, streaming, persistence, database change, or academic mutation is enabled.

## Added scaffold

- `api/ai-instructor.ts` defines a POST-only, no-store endpoint placeholder.
- `api/_lib/ai-instructor-policy.ts` allowlists six advisory modes and names nine prohibited actions.
- `api/_lib/ai-instructor-output.ts` defines strict advisory and error DTOs with required safety labels.
- `src/features/ai-instructor/liveCoachClient.ts` provides an opt-in frontend wrapper with safe fallback behavior.
- The environment flag name is `VITE_JPAC_LIVE_AI_ENABLED`.
- Requests are limited to one allowlisted `mode` field and 2,048 serialized characters.
- The client validates every required fallback field and safety label before accepting a response.

## Default behavior

Live AI remains off unless `VITE_JPAC_LIVE_AI_ENABLED` is exactly `true`. The client wrapper is not connected to any current Coach component, so the Phase 1 deterministic Coach remains active regardless of the flag.

The server endpoint has no provider branch. Even when called with the flag enabled on the client, it returns a Phase 1 deterministic fallback response with:

- `liveAIEnabled: false`
- `advisoryOnly: true`
- `teacherReviewRequired: true`
- `completenessCheckOnly: true`
- No score, approval, or final-grade fields

## Authentication boundary

The Phase 2A endpoint requires a non-empty bearer token before returning fallback guidance. This is a fail-closed placeholder, not production token validation. Before any provider is connected, a focused implementation must:

- Verify the token server-side against the approved authentication system.
- Derive the caller identity and role from the verified session.
- Perform object-level authorization for every context identifier.
- Allowlist and redact all context fields.
- Default to denial when identity or authorization cannot be proven.

Phase 2A performs no database query and does not use a service-role key.

## Allowed advisory modes

- `lesson_explanation`
- `practice_recommendation`
- `assignment_checklist`
- `submission_precheck`
- `teacher_feedback_revision_plan`
- `teacher_review_summary`

## Prohibited actions

- `auto_grade`
- `auto_approve`
- `award_xp`
- `update_progress`
- `issue_certificate`
- `change_enrollment`
- `publish_curriculum`
- `upload_media`
- `invoke_review_rpc`

The scaffold exposes no function, model tool, route, or client callback capable of these actions.

## Intentionally not enabled

- No OpenAI, Vercel AI Gateway, or other provider call
- No provider SDK or new package
- No provider key or secret
- No live chat UI
- No streaming
- No conversation or prompt persistence
- No Supabase query or write
- No service-role credential
- No new database table or migration
- No media input or upload
- No assignment or extra-credit submission
- No teacher review RPC
- No XP, progress, mastery, grade, certificate, enrollment, or curriculum mutation

## Future provider integration gates

Before adding a provider:

1. Add verified server-side authentication and object authorization.
2. Define context allowlists and prohibited-data tests.
3. Add strict request and response schema validation.
4. Add prompt-injection, refusal, rate-limit, timeout, and abuse tests.
5. Add provider credentials only through approved server-side environment management.
6. Keep provider code server-only and add no model tools with mutation authority.
7. Preserve deterministic fallback for disabled, denied, invalid, timed-out, or failed requests.
8. Obtain explicit approval for any package, configuration, live AI, database, or production visual test action.

## Rollback

Phase 2A is isolated. Rollback consists of reverting the focused scaffold commit. Because no current Coach surface imports the client wrapper and no database object is created, rollback does not require SQL, data repair, or changes to Phase 1 behavior.

If future wiring is introduced, disabling `VITE_JPAC_LIVE_AI_ENABLED` must immediately restore deterministic-only behavior. The server endpoint should also retain an independent kill switch before any provider launch.

## Safety conclusion

The scaffold is readiness infrastructure only. JPAC AI Instructor remains deterministic, teacher review remains required, and protected academic systems remain outside the endpoint and client wrapper.
