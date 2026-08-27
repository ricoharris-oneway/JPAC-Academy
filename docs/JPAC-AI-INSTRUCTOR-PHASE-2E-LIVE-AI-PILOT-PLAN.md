# JPAC AI Instructor Phase 2E: Live AI Pilot Enablement Plan

## Planning status

- Phase: 2E planning only
- Baseline: `main` at `3bf31a64e2289edab0af2e9b987e495abf57d662`
- Runtime state: live AI remains disabled and unwired
- Current experience: Phase 1 deterministic JPAC Coach remains active

This document defines the approval and safety gates for a future internal live-AI pilot. It does not add provider credentials, change environment configuration, enable a provider, connect the Coach UI, or modify any database record.

## 1. Pilot goal

The first pilot should enable one narrowly scoped live-AI guidance mode for a small group of internal test users. The recommended first mode is `lesson_explanation`.

The pilot should determine whether live explanations make published lessons easier to understand while preserving JPAC's academic and privacy boundaries. The Phase 1 deterministic Coach must remain available as the immediate fallback for disabled, denied, invalid, timed-out, or failed requests.

## 2. Why `lesson_explanation` is first

`lesson_explanation` has the lowest academic-risk profile because it:

- Explains content already published and authorized for the student.
- Produces advisory guidance only.
- Does not grade or score work.
- Does not make submission decisions.
- Does not approve, reject, or invoke teacher review actions.
- Does not need student history, private staff notes, assignment evidence, or media.
- Does not mutate student records, progress, mastery, XP, certificates, or enrollment.

The pilot must not treat an explanation as authored curriculum, a final assessment, or a teacher decision.

## 3. Required environment setup for a future pilot

These values are proposed for a later approved configuration action. Phase 2E does not set them.

### Server-only variables

| Variable | Pilot purpose |
| --- | --- |
| `JPAC_AI_SERVER_ENABLED=true` | Authoritative server-side provider kill switch. Human approval is required before enabling. |
| `JPAC_AI_PROVIDER=vercel_ai_gateway` or `openai` | Selects the approved server transport. Prefer the gateway path for the first pilot unless review selects the direct backup. |
| `JPAC_AI_MODEL=<approved model>` | Names the model approved during the pilot-readiness review. No model is selected in this plan. |
| `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY` | Server-only provider credential. Exactly one credential should be provisioned for the selected path. |
| `JPAC_AI_REQUEST_TIMEOUT_MS` | Sets the bounded provider timeout; retain the tested default unless review approves a change. |
| `JPAC_AI_MAX_PROMPT_CHARS` | Sets the maximum bounded prompt size; retain the tested limit unless review approves a change. |

### Client-visible variable

| Variable | Pilot purpose |
| --- | --- |
| `VITE_JPAC_LIVE_AI_ENABLED=true` | Allows the approved pilot UI to request live guidance. It is a UX flag only. |

The client flag is not a security or authorization boundary. Provider execution requires the server flag, valid server configuration, verified authentication, mode authorization, and object-level authorization. Provider keys must never use a `VITE_` prefix, enter frontend bundles, or be returned to clients.

## 4. Pilot scope

- Participants: 3–5 controlled internal test users.
- Learning scope: Singing Beginner Module 1 only.
- Curriculum scope: published, student-authorized lessons only.
- AI mode: `lesson_explanation` only.
- Provider: one approved provider path at a time.
- Environment: preview/internal pilot before any production-wide exposure.
- Human oversight: designated teacher/admin reviews pilot behavior and incidents.

Explicitly excluded:

- Teacher review summaries.
- Assignment checklist or submission pre-check modes.
- Teacher-feedback revision planning.
- Extra-credit AI preparation or review.
- Student-wide or public rollout.
- Conversation history or persistence.
- Any AI-triggered academic mutation.

## 5. Allowed AI context

The pilot request may include only the minimum data already authorized for the student:

- Published lesson title.
- Published lesson objective.
- Published lesson body or student-visible instructions.
- Current authorized course, module, and lesson identifiers.
- A bounded student question or selected help request for the current lesson.
- The selected mode, fixed as `lesson_explanation`.

The pilot must not include:

- Private staff, moderation, disciplinary, or internal review notes.
- Full student history, cross-course history, or another student's records.
- Draft, hidden, archived, or unpublished curriculum.
- Assignment submissions, extra-credit evidence, grades, or review records.
- Contact information, precise location, secrets, credentials, or raw auth data.
- Images, audio, video, camera frames, microphone input, files, or media URLs.
- Full conversation history; each initial pilot request remains stateless.

Student text must be treated as untrusted evidence, not instructions that can override policy.

## 6. Prohibited AI behavior

Live AI must never:

- Score or grade student work.
- Approve or reject submissions or extra credit.
- Make a review or final academic decision.
- Issue certificates or change certificate eligibility.
- Award, remove, or recommend writing XP.
- Update lesson, module, course, enrollment, or other progress.
- Award mastery or change unlock state.
- Submit work or prepare a submission without deliberate student action.
- Invoke teacher-review, extra-credit-review, or protected academic RPCs.
- Create, change, or remove enrollments or roles.
- Publish, edit, or expose draft curriculum.
- Upload, retain, transform, or request media.
- Provide medical, legal, diagnostic, or crisis counseling.
- Claim to be a human teacher or imply its guidance is authoritative.

Sensitive or crisis-related requests must receive approved safe redirection to a trusted adult or appropriate emergency resource, not improvised counseling.

## 7. Pilot test checklist

### Automated and endpoint tests

- [ ] Server disabled: deterministic fallback is returned and provider fetch is not called.
- [ ] Missing provider key: deterministic fallback is returned.
- [ ] Invalid or unsupported provider: deterministic fallback is returned.
- [ ] Provider timeout: request is aborted and deterministic fallback is returned.
- [ ] Invalid JSON or schema-invalid model output: deterministic fallback is returned.
- [ ] Protected decision language or fields: output is rejected.
- [ ] Prompt injection in student text and curriculum evidence cannot override policy.
- [ ] Unauthenticated requests fail closed.
- [ ] Student role can request only an authorized published lesson in the pilot scope.
- [ ] Teacher/staff role receives no additional mode or private context unless separately authorized.

### Manual preview and production smoke tests

- [ ] Verify the pilot flag is invisible and inactive for non-pilot accounts.
- [ ] Verify Singing Beginner Module 1 is the only allowed course/module scope.
- [ ] Verify `lesson_explanation` is the only enabled mode.
- [ ] Verify safety labels state advisory guidance and teacher-review boundaries.
- [ ] Verify the Phase 1 Coach remains usable before, during, and after provider failure.
- [ ] Verify no requests contain unpublished curriculum, private notes, history, or media.
- [ ] Verify no XP, progress, mastery, certificate, enrollment, submission, review, or curriculum record changes.
- [ ] Verify no provider or server error exposes prompts, stack traces, configuration, or secrets.
- [ ] Verify timeout, cost, refusal, and age-appropriateness behavior with the designated pilot reviewer.

Production visual testing is a human approval gate and must not be inferred from automated checks.

## 8. Human approval gates

Explicit human approval is required before:

- Provisioning or changing provider keys.
- Enabling `JPAC_AI_SERVER_ENABLED` in any hosted environment.
- Enabling `VITE_JPAC_LIVE_AI_ENABLED`.
- Wiring `liveCoachClient` into a Coach or lesson UI.
- Selecting or changing the provider or model.
- Adding pilot users or changing access rules.
- Beginning production visual testing.
- Expanding beyond `lesson_explanation`.
- Adding persistence, conversation history, analytics containing student text, or database schema.
- Allowing any AI-generated content to write academic records.
- Expanding beyond the 3–5 internal users or Singing Beginner Module 1.
- Launching to all students or the public.

An approval for one gate does not authorize the others.

## 9. Rollout sequence

### Phase 2E: plan only

- Approve pilot scope, context, tests, provider review, and human owners.
- Keep both server and client flags disabled.

### Phase 2F: UI wiring behind an off flag

- Add a focused `lesson_explanation` UI surface for authorized published lessons.
- Keep client and server flags off.
- Verify deterministic fallback and accessibility without calling a provider.

### Phase 2G: internal `lesson_explanation` pilot

- Provision the approved provider secret and enable the server/client flags through separate authorized actions.
- Allow only 3–5 internal users and Singing Beginner Module 1.
- Monitor safety, helpfulness, latency, cost, refusals, and fallback behavior.

### Phase 2H: pilot review report

- Record test results, incidents, unsafe or misleading responses, cost, and teacher feedback.
- Disable flags while changes or unresolved blockers are reviewed.
- Decide whether to stop, repeat, or advance.

### Phase 2I: optional `practice_recommendation` expansion

- Consider `practice_recommendation` only after Phase 2H passes with explicit approval.
- Keep all assignment, submission, review, and mutation modes disabled.

## 10. Rollback plan

1. Set `VITE_JPAC_LIVE_AI_ENABLED=false` to remove pilot UI requests.
2. Set `JPAC_AI_SERVER_ENABLED=false` to stop provider execution authoritatively.
3. Confirm provider calls stop and deterministic fallback is returned.
4. Confirm Phase 1 deterministic Coach remains active across existing surfaces.
5. Remove or rotate the pilot provider credential if the incident involves key exposure or provider misuse.
6. Revert the focused UI-wiring release if needed.
7. Document the incident and verification results before any re-enable decision.

No database rollback is required because the pilot design permits no persistence or schema change.

## 11. Success criteria

The pilot may be considered successful only when:

- No blank screens, crashes, or unhandled provider errors occur.
- No unsafe, age-inappropriate, medical/legal/crisis, or privacy-invasive advice is produced.
- Responses contain no grading, approval, rejection, review-decision, or other academic-authority language.
- No protected academic or curriculum mutation occurs.
- Explanations are helpful, faithful to the authorized published lesson, and readable for the pilot students.
- Teacher-review and advisory-only boundaries remain clear.
- Prompt-injection and unauthorized-context tests pass.
- Every disabled, missing-config, invalid-output, timeout, and provider-failure scenario returns deterministic fallback.
- Provider secrets remain server-only and no private or prohibited context is transmitted.
- The designated teacher/admin and release owner approve the Phase 2H pilot report.

Passing technical checks alone does not authorize expansion. Any later mode or broader audience requires a new focused release and human approval.
