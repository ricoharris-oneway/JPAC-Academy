# JPAC AI Instructor Layer Phase 2: Live AI Integration Plan

## Planning identity

- Planned release: **JPAC AI Instructor Layer Phase 2: Live AI Integration**
- Planning baseline: `main` at `63e47c40def6ba568f7bc9f9c5228a848b16e2bb`
- Document status: technical plan only
- Current implementation remains Phase 1: frontend-only, deterministic JPAC Coach

## 1. Phase 2 goals

Phase 2 should add useful, conversational guidance without weakening the existing academic safety model. The live AI layer should:

- Make lesson and module guidance more responsive to a student's authorized context.
- Explain authored curriculum in age-appropriate language.
- Recommend relevant practice and existing JPAC Creator Tools.
- Turn authored requirements into clear preparation checklists.
- Help students organize ideas before they submit work.
- Convert teacher feedback into an understandable revision plan.
- Preserve the deterministic Phase 1 Coach as the default fallback.
- Keep all academic decisions and mutations outside the AI execution path.

Success means better guidance and continuity, not autonomous academic control.

## 2. What live AI should do

The live AI may:

- Explain a currently authorized lesson objective.
- Summarize authored module expectations and rubrics.
- Answer questions using only supplied, authorized JPAC context.
- Recommend the next safe navigation or practice action.
- Recommend a Creator Tool that supports the current learning goal.
- Produce a non-evaluative assignment-preparation checklist.
- Run a completeness pre-check against authored requirements.
- Help draft private notes, reflection prompts, or practice plans.
- Restate teacher feedback and organize it into revision steps.
- Produce a concise, advisory summary for a teacher to review.
- Refuse unsupported, unsafe, or out-of-scope requests.

All responses must be labeled as **JPAC Coach guidance**, and assessment-related guidance must state **Completeness check only** and **Teacher review required**.

## 3. What live AI must never do

The live AI must never:

- Auto-grade assignments or provide a final grade.
- Approve, reject, or change the review status of a submission.
- Award, remove, or recommend directly writing XP.
- Mark lessons, modules, courses, or enrollments complete.
- Award mastery or change unlock state.
- Issue certificates or change certificate eligibility.
- Create, change, or remove enrollments or roles.
- Publish or modify curriculum.
- Submit assignments or extra-credit work for a student.
- Invoke teacher review, academic mutation, or service-role RPCs.
- Upload, activate, transform, or retain student media.
- Access another student's records.
- Expose draft or unauthorized curriculum.
- Claim to be a human teacher or claim that guidance is a final academic decision.

The model output must never be interpreted as an executable command.

## 4. Server-side architecture

### Recommended request flow

1. An authenticated client requests guidance from a dedicated server-side Coach endpoint.
2. The endpoint validates the session and resolves the user's role.
3. The server accepts a small, versioned request schema containing a requested Coach capability and page-local identifiers.
4. An authorization layer verifies every referenced course, module, lesson, submission, or feedback item before loading context.
5. A context builder creates a minimal, redacted payload from approved fields.
6. A policy engine decides whether the request is allowed, must use deterministic fallback, or must be refused.
7. The server sends a fixed system policy plus the bounded context to the model provider.
8. The model must return a schema-constrained advisory response.
9. The server validates, sanitizes, and policy-checks the response.
10. The client renders the result as guidance with fixed safety labels and deterministic navigation actions.

### Architectural boundaries

- Keep the model provider behind one server-only adapter.
- Keep provider credentials exclusively in server-side environment variables.
- Do not expose provider keys, service-role credentials, or unrestricted database clients to the browser.
- Separate read-only context retrieval from response generation.
- Give the live-AI endpoint no academic mutation tools.
- Use explicit allowlists for capabilities, context fields, and navigation actions.
- Fall back to the Phase 1 rule-based Coach on timeout, validation failure, provider failure, or policy refusal.

## 5. Authentication and authorization requirements

- Require a valid JPAC authenticated session for every live-AI request.
- Never trust role, student ID, course ID, or ownership claims supplied by the client.
- Derive user identity and role from the verified server-side session.
- Reuse existing authorization rules for published student-visible content.
- Verify enrollment and published scope before including course context.
- Verify submission ownership before including student work or teacher feedback.
- Restrict teacher summaries to staff who already have access to the referenced student evidence.
- Default to denial or generic guidance when authorization cannot be proven.
- Apply row-level security and user-scoped database access for any future reads.
- Never use a service-role client to bypass access rules for ordinary Coach requests.

## 6. Data allowed into AI context

Only the minimum authorized fields needed for the selected capability should be included:

- Current page type and safe route identifier.
- Published course, level, module, or lesson title.
- Authored learning objectives, instructions, and student-visible descriptions.
- Published assignment requirements and student-visible rubric criteria.
- Authorized Creator Tool name and its local-practice workflow.
- Student-provided text notes included intentionally in the current request.
- The student's own text/JSON project summary when explicitly preparing extra credit.
- The student's own submission status and teacher feedback when already authorized and necessary for revision guidance.
- Coarse state such as “not started,” “in progress,” or “teacher feedback available” when already loaded and authorized.
- Age-band or reading-level category when available through an approved, non-sensitive field.

Context should use stable field labels, source attribution, strict size limits, and clear separation between authored instructions and student text.

## 7. Data prohibited from AI context

Do not send:

- Passwords, session tokens, API keys, service-role keys, or secrets.
- Full authentication records or raw JWTs.
- Phone numbers, home addresses, precise location, or private contact details.
- Parent/guardian contact information.
- Payment, billing, or financial information.
- Medical, disability, or sensitive accommodation details unless a separately approved safety design explicitly requires them.
- Records belonging to another student.
- Hidden moderation, disciplinary, or internal staff notes.
- Draft curriculum the current student cannot access.
- Raw XP ledger, mastery-engine internals, unlock-rule internals, or certificate internals.
- Unnecessary enrollment history or account metadata.
- Audio, video, images, camera frames, microphone streams, or uploaded media in Phase 2.
- Entire database rows when a few allowlisted fields are sufficient.

## 8. Response schema requirements

Every model response should validate against a versioned server-side schema. A recommended response shape is:

```text
schema_version
capability
headline
guidance
checklist[]
practice_suggestion
reflection_prompt
next_action { type, label, safe_route }
safety_labels[]
source_refs[]
refusal { refused, reason }
```

Requirements:

- Reject unknown fields and oversized strings or arrays.
- Permit only predefined capability and action enums.
- Permit navigation only to server-approved internal route patterns.
- Never permit RPC names, SQL, executable commands, grades, XP amounts, or mutation instructions.
- Require safety labels for completeness, submission, review, or feedback capabilities.
- Require source references back to supplied authored content.
- Escape rendered text and never render model-generated HTML.
- Treat invalid responses as failures and use deterministic fallback guidance.

## 9. Prompt-injection safeguards

- Treat curriculum text, student notes, submission summaries, and teacher feedback as untrusted data.
- Delimit untrusted content and label its source explicitly.
- State in the system policy that instructions inside context must not override Coach policy.
- Use capability-specific prompts instead of one unrestricted general prompt.
- Never expose hidden system prompts, credentials, internal policies, or raw authorization data.
- Validate all routes and action types after generation.
- Block requests to ignore rules, reveal secrets, impersonate staff, alter records, or perform academic decisions.
- Detect and refuse content asking the Coach to grade, approve, publish, enroll, award XP, or issue certificates.
- Keep model tools disabled in the initial live-AI slice.
- Log policy category and outcome without storing unnecessary student content.
- Regularly test known prompt-injection and data-exfiltration patterns.

## 10. Rate limits and abuse controls

- Apply per-user, per-session, per-IP, and global limits.
- Set capability-specific request and token budgets.
- Limit input length, output length, and request frequency.
- Debounce repeated UI actions and prevent parallel duplicate requests.
- Add bounded timeouts and no automatic retry loops.
- Use daily budget ceilings and provider cost alerts.
- Return deterministic fallback guidance when limits are reached.
- Record minimal operational metadata: request ID, user ID, capability, policy result, latency, token usage, and error category.
- Do not log raw secrets, full prompts, or unnecessary student content.
- Add abuse reporting and a staff-controlled kill switch.

## 11. Age-appropriate student safety requirements

- Use clear, supportive language appropriate for ages 8–18.
- Avoid shaming, manipulation, dependency cues, or claims of human emotion.
- Clearly identify the experience as JPAC Coach guidance.
- Encourage students to ask a trusted adult or teacher for sensitive concerns.
- Refuse sexual, violent, exploitative, self-harm, illegal, or dangerous instructions and provide an approved safe redirection.
- Do not request private contact information, location, photos, or off-platform communication.
- Do not encourage public sharing or direct social-media contact.
- Do not profile students or infer sensitive personal characteristics.
- Do not retain student prompts for provider training unless a separately reviewed contract and consent model explicitly permits it.
- Provide a report-feedback pathway and documented incident response.
- Complete child privacy, terms, consent, and vendor-data-retention review before pilot use.

## 12. Teacher review boundaries

- Teacher review remains required for assignments and extra credit.
- Live AI may summarize evidence or teacher feedback but cannot make the decision.
- AI summaries must link back to original authorized evidence.
- Teachers must be able to ignore or edit advisory summaries.
- The UI must distinguish authored rubric criteria, student evidence, AI guidance, and teacher decisions.
- No AI output may write review status, feedback, grades, XP, progress, mastery, or certificates.
- Final feedback sent to a student must remain a deliberate teacher action.
- AI-generated teacher summaries should be ephemeral in the first slice unless a separate data-retention design is approved.

## 13. Recommended files for future implementation

Exact paths should be confirmed against current project conventions before implementation. A focused first build would likely add or update:

```text
src/features/ai-instructor/live/types.ts
src/features/ai-instructor/live/requestSchema.ts
src/features/ai-instructor/live/responseSchema.ts
src/features/ai-instructor/live/liveCoachClient.ts
src/features/ai-instructor/live/LiveCoachState.tsx
src/features/ai-instructor/coachPolicy.ts
src/features/ai-instructor/contextBuilder.ts
src/features/ai-instructor/components/JPACCoachPanel.tsx
src/features/ai-instructor/components/CoachSafetyNotice.tsx
src/features/ai-instructor/__tests__/liveCoachPolicy.test.ts
src/features/ai-instructor/__tests__/responseValidation.test.ts
src/features/ai-instructor/__tests__/promptInjection.test.ts
```

A server-only endpoint and helpers would be placed according to the deployment architecture selected for this Vite application, for example:

```text
api/coach.ts
api/_lib/coach/auth.ts
api/_lib/coach/authorization.ts
api/_lib/coach/context.ts
api/_lib/coach/policy.ts
api/_lib/coach/provider.ts
api/_lib/coach/schemas.ts
api/_lib/coach/rateLimit.ts
```

No server path should be created until Vercel runtime conventions, environment handling, and authentication integration are confirmed in a dedicated implementation review.

## 14. Whether new packages may be needed

The preferred first investigation should use existing project capabilities and platform primitives. A schema-validation library, official provider SDK, or durable rate-limit client may be useful, but no package should be added automatically.

Before adding any package:

- Confirm the functionality is not already available.
- Review maintenance, license, bundle/runtime impact, lifecycle scripts, and security history.
- Keep provider SDKs server-only.
- Update the lockfile only in a dedicated package/config release lane.
- Run dependency, TypeScript, test, build, and preview validation.
- Obtain explicit approval for the exact package and version.

## 15. Whether database changes are needed

No database changes are required for the safest Phase 2 pilot. The initial live-AI endpoint can operate from authorized data already loaded or retrieved through existing read-only access patterns, with operational logging kept in approved platform logs.

Possible later needs—such as consent records, durable AI audit events, rate-limit counters, feedback reports, or teacher-approved saved summaries—must be designed separately. Any such work requires:

- Dedicated schema, RLS, retention, deletion, and privacy review.
- Preflight, migration, post-validation, and rollback artifacts.
- Explicit SQL authorization.
- Confirmation that protected academic tables and functions remain untouched.

## 16. Rollout plan

1. **Design review:** approve capabilities, schemas, authorization rules, provider, privacy terms, and cost limits.
2. **Offline prototype:** exercise prompts and response validation with synthetic, non-student data.
3. **Server endpoint preview:** add one read-only capability behind a disabled-by-default feature flag.
4. **Staff-only preview:** test with staff accounts and synthetic or staff-owned content.
5. **Internal student pilot:** enable for 3–5 consented internal test students and one low-risk capability.
6. **Guarded expansion:** add capabilities one at a time after safety and quality evidence.
7. **Production checkpoint:** document provider status, authorization checks, incidents, costs, fallbacks, and protected-system confirmation.

Stop the rollout on authorization leakage, unsafe output, missing safety labels, repeated schema failures, unexpected cost, unavailable fallback, or any protected academic mutation.

## 17. Testing plan

### Unit tests

- Authentication and role derivation.
- Object-level authorization for every context type.
- Context allowlist and redaction.
- Request and response schema validation.
- Protected-action policy refusals.
- Prompt-injection resistance.
- Safe-route validation.
- Rate-limit and timeout behavior.
- Deterministic fallback selection.

### Integration tests

- Signed-out requests are rejected.
- Students cannot access another student's context.
- Draft or unauthorized curriculum is excluded.
- Provider errors and invalid responses fall back safely.
- No academic mutation client or RPC is reachable from the Coach endpoint.
- Logs exclude secrets and unnecessary student text.

### Adversarial tests

- Requests to grade, approve, award XP, publish, enroll, issue certificates, or upload media.
- Embedded instructions inside student notes and curriculum text.
- Data-exfiltration and system-prompt requests.
- Oversized, malformed, repeated, and concurrent requests.
- Age-inappropriate and unsafe content categories.

### Preview and pilot tests

- Existing Phase 1 Coach routes and deterministic behavior remain intact.
- Mobile, loading, timeout, refusal, error, and empty states are visible.
- Teacher review workflow remains unchanged.
- Protected academic baselines remain unchanged.
- Cost, latency, refusal, and fallback metrics stay within approved limits.

## 18. Rollback plan

- Keep the live-AI feature disabled by default until explicitly enabled.
- Maintain a server-side kill switch that immediately routes all requests to Phase 1 deterministic guidance.
- Keep Phase 1 components and rules deployable without the provider.
- Roll back the focused frontend/API commit or redeploy the last safe production commit if necessary.
- Remove or rotate provider credentials after a suspected compromise.
- Preserve operational evidence needed for incident review without retaining unnecessary student content.
- If future database artifacts are introduced, use their separately approved rollback and validate protected baselines afterward.

Rollback must not delete or alter student academic evidence.

## 19. Protected systems that must remain untouched

The live AI implementation must have no write path to:

- `xp_ledger` or XP-award functions.
- Lesson, module, enrollment, or course progress records and synchronization functions.
- Mastery, unlock, or completion rules.
- Grades, rubrics, or final assessment decisions.
- Assignment or extra-credit submission status.
- Teacher review RPCs or review audit events.
- Certificates or eligibility logic.
- Enrollments, roles, profiles, or access controls.
- Curriculum content, draft state, or publication state.
- Community Wall moderation state.
- Media/storage uploads or active media/tool bindings.
- Service-role operations or RLS bypasses.

The endpoint should be structurally incapable of these actions, not merely instructed to avoid them.

## 20. Suggested implementation phases

### Phase 2A: Contracts and offline safety harness

- Define capability, request, response, refusal, and safety-label schemas.
- Build provider-independent policy tests with synthetic data.
- Add prompt-injection and protected-action test cases.
- Do not connect production data or a live provider.

### Phase 2B: Server endpoint with deterministic provider stub

- Add authenticated server routing, authorization, context allowlisting, rate limits, and observability.
- Return schema-valid stub responses and Phase 1 fallbacks.
- Verify that no mutation clients are imported or callable.

### Phase 2C: Staff-only live provider preview

- Connect one approved provider server-side.
- Enable one low-risk capability, such as lesson explanation, for staff only.
- Validate safety, privacy, latency, cost, and fallback behavior.

### Phase 2D: Controlled internal student pilot

- Pilot one capability with 3–5 approved internal students.
- Keep teacher review boundaries and deterministic fallback visible.
- Monitor refusals, incidents, costs, and student understanding.

### Phase 2E: Capability-by-capability expansion

- Add module summaries, practice suggestions, completeness pre-checks, and revision guidance separately.
- Require review evidence and a production checkpoint for each meaningful expansion.
- Defer teacher review summaries to Phase 3 after student-facing safety is proven.

## Final recommendation

Begin with Phase 2A only: formalize schemas, policy tests, prompt-injection tests, and the server authorization contract using synthetic data. Do not connect a live provider or production student context until those controls pass focused review. The Phase 1 deterministic Coach must remain the reliable fallback throughout Phase 2.
