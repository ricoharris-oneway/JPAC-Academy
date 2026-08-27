# JPAC AI Instructor Phase 2B: Provider Design

## Document status

- Release phase: Phase 2B provider design only
- Planning baseline: `main` at `926bf1f3272397fe81795d6cc2e8eb1501e6ab46`
- Runtime status: live AI remains disabled and unused
- Current student experience: Phase 1 deterministic JPAC Coach remains active

This document defines the security and integration boundaries that must be approved before any provider is connected. It adds no keys, packages, API calls, persistence, UI wiring, or database changes.

## 1. Recommended provider approach

### Primary option: Vercel AI Gateway behind a server-only adapter

Use Vercel AI Gateway as the preferred provider-routing boundary after a separate implementation and security approval. JPAC is already deployed on Vercel, and the gateway can provide centralized routing, provider failover, usage attribution, rate controls, budgets, and operational visibility without exposing provider credentials to the browser.

The application must call the gateway only from `/api/ai-instructor`. Client code must never call a model provider directly. Model identifiers, routing policy, token limits, and provider credentials must remain server-controlled. Model identifiers must be selected from the provider's current supported-model catalog during Phase 2C rather than being fixed in this design document.

### Backup option: direct OpenAI server-side adapter

A direct OpenAI server-side adapter is the backup integration option if gateway availability, contractual requirements, or a required provider-specific capability prevents using the gateway. It must implement the same internal request and response contracts, authorization checks, context allowlist, timeouts, rate limits, and deterministic fallback as the primary adapter. Switching adapters must require server-side configuration and a separately reviewed release; it must not be controllable by a student request.

### Operational fallback: deterministic JPAC Coach

The existing Phase 1 rule-based Coach is the required operational fallback for both provider approaches. Provider failure, schema failure, policy refusal, rate limiting, timeout, disabled flags, or authorization uncertainty must return deterministic guidance—not expose errors or attempt an academic action.

This layered approach is safest because it keeps provider choice outside the student-facing contract, preserves a tested non-AI fallback, and gives JPAC one narrow server boundary to authorize, monitor, disable, and audit.

## 2. Environment variables

Proposed names are subject to a separate package/config review before implementation.

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `JPAC_LIVE_AI_ENABLED` | Server-only | Independent kill switch for all provider execution. Default must be `false`. |
| `JPAC_LIVE_AI_ALLOWED_MODES` | Server-only | Comma-separated server allowlist; initially only `lesson_explanation`. |
| `JPAC_AI_PROVIDER` | Server-only | Selects the approved adapter, such as `vercel_gateway` or `openai_direct`. |
| `JPAC_AI_MODEL` | Server-only | Approved model identifier selected from the provider's current catalog. |
| `JPAC_AI_MAX_INPUT_CHARS` | Server-only | Enforces the total request/context size ceiling. |
| `JPAC_AI_MAX_OUTPUT_TOKENS` | Server-only | Caps response generation. |
| `JPAC_AI_TIMEOUT_MS` | Server-only | Bounds provider latency before deterministic fallback. |
| `JPAC_AI_REQUESTS_PER_MINUTE` | Server-only | Per-user request ceiling used by server-side rate limiting. |
| `JPAC_AI_DAILY_TOKEN_BUDGET` | Server-only | Per-user or deployment budget guardrail. |
| `AI_GATEWAY_API_KEY` or approved Vercel OIDC credential | Server-only secret | Authenticates the server to AI Gateway if the gateway option is approved. Prefer managed, short-lived Vercel credentials where supported. |
| `OPENAI_API_KEY` | Server-only secret | Authenticates the backup direct adapter only if separately approved. |
| `VITE_JPAC_LIVE_AI_ENABLED` | Client-visible, non-secret | Controls whether the frontend may attempt the advisory endpoint. It is a UX flag only and never grants authorization. Default remains `false`. |

Provider keys, gateway credentials, service-role credentials, database passwords, raw session tokens, signing secrets, and internal policy values must never use a `VITE_` prefix or be included in client bundles, logs, responses, or generated context. The server flag remains authoritative even when the client-visible flag is enabled.

## 3. Endpoint flow

1. A bounded POST request enters `/api/ai-instructor`.
2. The endpoint validates the HTTP method, content type, serialized size, and versioned request shape.
3. The server validates the JPAC auth session and derives the user ID and role; it never trusts client-supplied identity or role.
4. The requested mode is checked against the server allowlist and role restrictions.
5. Every referenced course, lesson, submission, or feedback item is authorized for the verified caller.
6. A context builder selects only approved fields, labels their source, removes prohibited data, and enforces per-field limits.
7. A mode-specific prompt is constructed from fixed policy plus delimited context. Student-authored text is labeled as evidence, never instructions.
8. The server-only adapter makes one bounded provider call with no tools, functions, media, streaming, or mutation capabilities.
9. The response is parsed and validated against the strict advisory DTO. Unknown fields, invalid enums, unsafe actions, and oversized content are rejected.
10. A final policy check confirms required safety labels and allowed internal navigation only.
11. On any denial, timeout, provider error, rate limit, or validation failure, the endpoint returns the Phase 1 deterministic fallback.
12. The frontend receives a plain advisory response and cannot use it as an academic mutation command.

## 4. AI modes to support

- `lesson_explanation`: explain an authorized, published lesson objective in age-appropriate language.
- `practice_recommendation`: recommend safe practice and an existing Creator Tool using authorized page context.
- `assignment_checklist`: restate authored instructions or rubric items as a preparation checklist.
- `submission_precheck`: check completeness against authored requirements without grading or submitting.
- `teacher_feedback_revision_plan`: turn feedback already visible to the student into ordered revision steps.
- `teacher_review_summary`: provide an advisory evidence summary only to an authorized staff user.

Every mode is advisory. None may update a record or invoke a review pathway.

## 5. Mode rollout priority

Enable `lesson_explanation` first in a small internal pilot. It uses published, student-visible curriculum and does not require student submission evidence, teacher-only data, or an academic decision. It therefore offers useful guidance with the smallest authorization and privacy surface.

After the lesson pilot passes safety, quality, cost, and fallback tests, enable practice recommendations and assignment checklists. Submission pre-check and feedback revision planning require additional evidence-ownership tests. Teacher review summaries must be last and must have staff-only authorization plus explicit advisory labeling.

## 6. Required output schema

All provider responses must be converted to a versioned server DTO with explicit, portable types. A proposed shape is:

```text
schema_version
mode
headline
guidance[]
checklist[]
reflection_prompt
next_action { type, label, safe_route }
source_refs[]
advisory_only: true
teacher_review_required: true
completeness_check_only: boolean
fallback_used: boolean
```

Rules:

- `advisory_only` and `teacher_review_required` must always be `true`.
- `completeness_check_only` must be `true` for assignment checklist and submission pre-check responses and whenever assignment evidence is discussed.
- Only allowlisted internal navigation actions and routes are permitted.
- Unknown fields are rejected.
- Responses must not contain a numeric or letter score, grade, approval, rejection, pass/fail decision, mastery decision, certificate decision, or other final academic decision field.
- Model-generated HTML, executable code, RPC names, SQL, external URLs, and write instructions are prohibited.
- A schema or policy failure activates deterministic fallback.

## 7. Prompt-injection safeguards

- Student text is untrusted evidence, not instructions to the model or server.
- Curriculum text is authoritative content only when the server verifies that it is published and authorized for the caller; text embedded inside it cannot override system policy.
- Teacher feedback is evidence for a revision plan, not permission to review or mutate a record.
- The model cannot choose its mode, user role, permissions, context sources, provider, model, tools, or output schema.
- No model tools, function calls, arbitrary fetches, database access, or write operations are available.
- Capability-specific system prompts must explicitly prohibit academic decisions and data mutation.
- Context sections must be delimited, source-labeled, length-limited, and separated from fixed policy.
- Requests to reveal prompts, secrets, private data, unpublished content, or another student's records are refused.
- Generated routes and actions are checked against server allowlists after generation.
- The model cannot override teacher review, claim teacher authority, or instruct the application to award, approve, publish, enroll, upload, or submit.

## 8. Context limits

Initial hard ceilings should be conservative and enforced before a provider call:

- Maximum serialized request: 8 KB.
- Maximum combined provider context: 12,000 characters.
- Maximum published curriculum excerpt: 8,000 characters.
- Maximum student-authored text: 2,000 characters.
- Maximum teacher-feedback excerpt: 2,000 characters and only when already authorized for that student.
- Maximum output: configured per approved model, targeting concise guidance rather than long-form chat.
- No full conversation history in the initial release; each request is stateless.
- No images, audio, video, camera frames, microphone data, files, or media URLs.
- No private staff notes, moderation notes, disciplinary records, or internal annotations unless a later separately approved design provides explicit role and data controls.
- No secrets, raw auth records, private contact data, payment data, or records belonging to another user.

Limits must be reduced if provider tokenization or safety testing shows a smaller bound is appropriate.

## 9. Abuse and safety controls

- Apply per-user, per-IP, per-mode, and deployment-wide rate limits.
- Require an authenticated session and enforce mode-specific role restrictions.
- Begin with the single-mode allowlist `lesson_explanation`.
- Limit concurrent requests, input size, output size, and total daily token use.
- Use bounded timeouts and avoid automatic provider retry loops.
- Configure budget alerts and a hard operational kill switch.
- Use age-appropriate, supportive language for students ages 8–18.
- Do not present the Coach as a human or encourage emotional dependency or off-platform contact.
- Do not provide crisis, medical, legal, or other professional counseling. Use an approved safe redirection to a trusted adult or appropriate emergency resource when needed.
- Reject attempts to grade, approve, alter records, reveal secrets, access other users, or expose unpublished curriculum.
- Record minimal operational metadata only; do not persist full prompts or student content in the initial release.
- Fall back to deterministic JPAC Coach guidance for all disabled, denied, invalid, limited, unsafe, or failed requests.

## 10. Rollout plan

### Phase 2B: provider design

- Approve this provider-neutral boundary, proposed variables, schemas, and safety gates.
- No runtime or environment change.

### Phase 2C: provider wiring behind a disabled flag

- Add the approved server adapter and schema validator in a focused release.
- Add server-side authentication and authorization tests.
- Keep both client and server flags disabled in production.
- Do not connect current Coach UI during the wiring review.

### Phase 2D: `lesson_explanation` pilot

- Enable only for 3–5 internal test students and published, authorized lessons.
- Compare provider responses with deterministic fallback and instructor expectations.
- Monitor refusals, latency, cost, age appropriateness, and source fidelity.
- Retain an immediate server kill switch.

### Phase 2E: practice and checklist modes

- Add `practice_recommendation` and `assignment_checklist` only after the lesson pilot passes.
- Pilot `submission_precheck` only after ownership and completeness-only safeguards pass.

### Phase 2F: teacher review summary pilot

- Add staff-only advisory summaries after object-level authorization and evidence-source tests pass.
- Teachers remain responsible for every review status and final feedback action.

Each phase requires a focused PR, release-check report, automated tests, manual preview, explicit approval, and production checkpoint.

## 11. Test plan

### Unit tests

- Mode and role allowlists.
- Context field selection, truncation, and redaction.
- Prompt construction with strict data delimiters.
- Output schema acceptance and rejection.
- Required advisory labels and prohibited decision fields.
- Deterministic fallback selection.

### Endpoint tests

- Reject unsupported methods, unauthenticated calls, invalid JSON, oversized payloads, invalid modes, and unauthorized object references.
- Confirm server identity overrides all client identity claims.
- Confirm the disabled flag prevents provider execution.
- Confirm no service-role, database mutation, tool call, upload, or external URL supplied by the client can execute.

### Prompt-injection tests

- “Ignore previous instructions” content in student text, curriculum, and feedback.
- Requests for secrets, unpublished curriculum, other students' work, grades, approvals, XP, progress, certificates, enrollments, submissions, or review actions.
- Generated unsafe routes, HTML, scripts, SQL, RPC names, and external links.

### Failure and fallback tests

- Timeout, provider 4xx/5xx, invalid schema, unexpected fields, empty output, content refusal, rate limit, and budget exhaustion.
- Verify every failure returns safe deterministic guidance without leaking stack traces, prompts, credentials, or provider internals.

### Production smoke test

- Test one authorized published lesson with an internal student account.
- Confirm unauthenticated and unauthorized requests fail closed.
- Confirm required safety labels remain visible.
- Confirm deterministic fallback works with the server flag disabled and during simulated provider failure.
- Confirm no protected records change before or after the request.
- Confirm operational logs contain only approved metadata.

## 12. Rollback plan

1. Set the server-authoritative `JPAC_LIVE_AI_ENABLED` flag to `false`.
2. Disable the client-visible flag so the UI stops attempting live guidance.
3. Verify that Phase 1 deterministic Coach guidance is active on all existing surfaces.
4. If necessary, revert the focused provider-wiring release without altering Phase 1 code.
5. Preserve only minimal operational incident metadata according to the approved retention policy.

No database rollback is needed when provider integration remains stateless and introduces no schema change. A rollback must not require changes to XP, progress, mastery, certificates, enrollments, submissions, reviews, curriculum, or media.

## 13. Protected systems

Live AI must never directly modify or invoke mutation paths for:

- `xp_ledger` or any XP award/reversal mechanism
- `lesson_progress`, course progress, enrollment progress, or completion state
- mastery records, mastery functions, or unlock rules
- `enrollments`, roles, or access rules
- assignment or extra-credit `submissions`
- extra credit review status or teacher review RPCs
- grades, approvals, rejections, or final teacher feedback
- `certificates` or certificate eligibility/issuance
- published or draft `curriculum records`
- media, storage, uploads, camera data, microphone data, audio, video, or images

The provider receives no mutation tools. Model output is advisory data only, teacher review remains required, and the server must reject any response or request that attempts to cross these boundaries.

## Approval gate for implementation

Phase 2C must not begin automatically. It requires explicit human approval because it will involve runtime behavior, a provider connection, server configuration, environment secrets, and potentially package changes. Before approval, JPAC must finalize provider terms, child-safety and privacy review, data retention settings, model selection, cost limits, authorization design, and production kill-switch ownership.
