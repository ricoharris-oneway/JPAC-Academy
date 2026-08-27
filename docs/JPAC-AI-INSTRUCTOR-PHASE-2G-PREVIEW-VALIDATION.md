# JPAC AI Instructor Phase 2G: Preview-Only Live AI Validation

## Purpose and boundary

Phase 2G validates the existing `lesson_explanation` pathway in a Vercel Preview deployment. It adds no student-facing capability and does not authorize production enablement. The test remains manual, stateless, advisory-only, and limited to an approved internal test account and published lesson already visible to that account.

Phase 1 deterministic JPAC Coach remains the default and required fallback. This checklist does not approve additional modes, persistence, media, academic actions, provider credentials in source control, or promotion of a preview deployment to production.

The current endpoint checks only for a non-empty bearer token; it does not yet verify the token server-side or resolve object-level authorization. Because the Phase 2F request contains no lesson or student context, Phase 2G may exercise only the mode-only preview pathway with an approved internal account. This authentication boundary is not production-ready and must be resolved in a separately approved release before production enablement or transmission of lesson/student context.

## Preview environment variables

Configure these values in the Vercel **Preview** environment only. Do not commit values or secrets to the repository.

| Variable | Preview requirement |
| --- | --- |
| `VITE_JPAC_LIVE_AI_ENABLED` | Set to the exact string `true` so the preview build includes the optional lesson-help panel. |
| `JPAC_AI_SERVER_ENABLED` | Set to the exact string `true` to permit the server transport in Preview. |
| `JPAC_AI_PROVIDER` | Use one existing supported value: `vercel_ai_gateway` or `openai`. |
| `JPAC_AI_MODEL` | Use the separately approved model identifier for the selected provider. Do not place a real model selection in this document. |
| `AI_GATEWAY_API_KEY` | Server-only secret required only when `JPAC_AI_PROVIDER=vercel_ai_gateway`. Use a Vercel-managed Preview secret value. |
| `OPENAI_API_KEY` | Server-only secret required only when `JPAC_AI_PROVIDER=openai`. Use a Vercel-managed Preview secret value. |
| `JPAC_AI_REQUEST_TIMEOUT_MS` | Optional. Leave unset to use the tested 8,000 ms default unless a separate review approves another value. |
| `JPAC_AI_MAX_PROMPT_CHARS` | Optional. Leave unset to use the tested 6,000-character default unless a separate review approves another value. |

Configure exactly one provider path and its matching credential. Never use a `VITE_` prefix for a provider credential. After changing a build-time `VITE_` value, create a fresh Preview deployment; do not promote that deployment to production.

## Production must remain disabled

In the Vercel **Production** environment:

- `VITE_JPAC_LIVE_AI_ENABLED` must be missing or set to `false`.
- `JPAC_AI_SERVER_ENABLED` must be missing or set to `false`.
- Do not promote the enabled Preview deployment to Production.
- Provider credentials, if managed for later use, do not authorize either flag to be enabled.

The server flag is authoritative. A true client flag alone may show the panel but cannot permit a provider call when the server flag is disabled.

## Confirmed runtime boundaries

### Server

- A non-`POST` request is rejected.
- A missing or empty bearer token is rejected.
- An invalid request shape or unsupported mode is rejected before provider configuration is read.
- When `JPAC_AI_SERVER_ENABLED` is missing or not exactly `true`, the endpoint returns the deterministic Phase 1 advisory fallback before constructing a prompt or calling the provider.
- When the provider name, model, or matching credential is missing, provider execution is skipped and the deterministic fallback is returned.
- Provider timeout, transport error, non-success response, malformed response, invalid schema, or protected decision language returns the deterministic fallback.
- Provider requests use `store: false`, `stream: false`, and no tools or media.

Although the server scaffold recognizes other future advisory modes, the Phase 2G UI and approved smoke test expose and send only `lesson_explanation`. Do not exercise or enable another mode during this validation.

### Client

- The panel is hidden unless `VITE_JPAC_LIVE_AI_ENABLED === "true"`.
- Rendering the lesson page does not call `/api/ai-instructor`.
- The existing deterministic JPAC Coach remains visible.
- A request occurs only after **Ask for lesson explanation** is clicked.
- The request body is exactly `{ "mode": "lesson_explanation" }`; it contains no lesson text, identifiers, student history, submissions, review data, or media.
- Unavailable authentication, endpoint, provider, or invalid response produces safe fallback messaging and does not crash the lesson page.

### Required safety copy

The Live AI Lesson Help panel must preserve all three visible boundaries:

- **Advisory guidance only**
- **Teacher review required**
- **This does not award XP or update progress**

## Exact Preview smoke test

Use an approved internal test account and browser developer tools. Record pass/fail observations without recording prompts, responses, tokens, credentials, or student data.

1. Confirm the deployment target is **Preview**, its source commit is the intended Phase 2G PR head, and it is not assigned a Production alias.
2. Confirm the Preview environment contains the two exact true flags and one complete, approved provider path. Confirm Production retains both flags as missing or false. Do not reveal secret values.
3. Open an authorized published lesson while signed out. Confirm normal authentication behavior prevents an authenticated live request.
4. Sign in with the approved internal test account and open the same lesson. Confirm Phase 1 deterministic JPAC Coach is visible.
5. Before clicking anything, confirm Live AI Lesson Help and its three safety statements are visible. In the Network panel, confirm no `/api/ai-instructor` request occurred during page render.
6. Click **Ask for lesson explanation** once. Confirm exactly one `POST /api/ai-instructor` request occurs and its JSON body is exactly `{ "mode": "lesson_explanation" }`.
7. Confirm the response is advisory, contains the required safety contract, displays without raw errors or secrets, and causes no navigation or academic action.
8. Temporarily disable `JPAC_AI_SERVER_ENABLED` in Preview and redeploy. Repeat the click and confirm a `phase_1_deterministic_fallback` response, no provider execution, and no lesson-page crash.
9. Restore the Preview server flag, remove or invalidate only the selected Preview provider configuration, and redeploy. Repeat the click and confirm the same safe deterministic fallback with no raw provider error.
10. Restore the approved Preview provider configuration only if continued testing is authorized. Confirm no XP, progress, mastery, certificate, enrollment, submission, review, curriculum, storage, or media state changed during any test.
11. Finish by setting both Preview flags to false or removing them, then redeploy and confirm the optional panel is hidden while Phase 1 Coach remains visible.
12. Reconfirm that both Production flags remain missing or false and that no Preview deployment was promoted.

## Expected fallback behavior

The server-disabled and provider-unavailable cases return HTTP 200 with the Phase 1 advisory response, `source: "phase_1_deterministic_fallback"`, and `liveAIEnabled: false`. The client labels this as a safe JPAC Coach fallback. Authentication or malformed-request failures fail closed; client-side network and validation failures show the existing unavailable message. None of these states may blank the lesson page or remove deterministic Coach guidance.

## Rollback

1. Set or restore `JPAC_AI_SERVER_ENABLED=false` in Preview and redeploy; this stops provider execution authoritatively.
2. Set or restore `VITE_JPAC_LIVE_AI_ENABLED=false` in Preview and redeploy; this removes the optional UI.
3. Confirm Phase 1 deterministic Coach remains visible and `/api/ai-instructor` is not requested on lesson render.
4. Remove or rotate the Preview provider credential only when required by the incident or provider-security process.
5. Confirm Production flags were not changed. No database rollback or data repair is required.

## Validation checklist

- [ ] Phase 2G change set is documentation-only.
- [ ] Preview and Production environment scopes were checked separately.
- [ ] Production client and server flags remain missing or false.
- [ ] No provider credential or secret appears in code, docs, logs, screenshots, or the client bundle.
- [ ] Panel is hidden with the client flag missing, false, or any value other than exact `true`.
- [ ] Panel is visible with the exact Preview client flag.
- [ ] No API request occurs on render.
- [ ] Manual click sends only `lesson_explanation` with no context.
- [ ] Server-disabled and missing-provider tests return deterministic fallback.
- [ ] Invalid methods, request shapes, and unsupported modes fail closed.
- [ ] Required advisory and teacher-review safety copy remains visible.
- [ ] Phase 1 deterministic Coach remains available through every failure case.
- [ ] No prompt or response persistence, polling, streaming, tools, media, or uploads occur.
- [ ] No XP, progress, mastery, certificate, enrollment, submission, review, or curriculum action occurs.
- [ ] Preview flags are disabled or removed after validation.
- [ ] No Preview deployment is promoted to Production.

## Safety stop conditions

Stop testing, disable both Preview flags, and retain only non-sensitive incident metadata if any request occurs on render, a payload contains more than the fixed mode, a secret appears in client output, fallback fails, safety labels disappear, another mode is exposed, the lesson page crashes, a provider response claims academic authority, or any protected record or media behavior changes.
