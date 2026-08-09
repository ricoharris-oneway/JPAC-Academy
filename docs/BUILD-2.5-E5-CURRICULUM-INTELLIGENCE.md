# Build 2.5 Phase E5 — Curriculum Intelligence Foundation

## Authority hierarchy

1. Published canonical curriculum and student evidence are protected records.
2. Approved JPAC curriculum and ARIA teaching standards are authoring sources.
3. Current staged curriculum and administrator instructions provide request context.
4. AI output is a proposal only. Conflicts are recorded for administrator review.

An older source never automatically replaces newer reviewed curriculum. Proposal approval is not publication.

## Architecture

- `curriculum_sources` versions approved reference collections independently of student curriculum.
- `curriculum_source_sections` stores maintainable, queryable sections by course, level, topic, and source version. Large source documents are not embedded in React.
- `curriculum_change_requests` records lesson, activity, module, or course authoring intent.
- `curriculum_proposals` stores current/proposed snapshots, change sets, rationale, validation, conflicts, provider provenance, and review state.
- Existing `curriculum_module_revisions` remains the specialized controlled Module 2 transition mechanism and is not replaced.

All E5 tables are administrator-only under RLS. No student policy exists. No E5 function applies or publishes a proposal.

## Provider boundary

`api/_lib/curriculum-intelligence.js` defines the provider contract. The initial implementation is a deterministic safe-development mock. The server endpoint validates the Supabase session, requires an `admin` or `developer` profile, and reloads canonical curriculum with the server client instead of trusting browser-provided curriculum payloads.

Future OpenAI, Gemini, or another approved provider must implement the same server-side `generate` contract. Credentials must remain in server environment variables and must never be exposed through `VITE_` configuration.

## Proposal lifecycle

`generated → review → approved | rejected → applied`

- `generated`: provider output exists.
- `review`: an administrator is inspecting differences and validation.
- `approved`: content is approved as an authoring proposal only.
- `rejected`: proposal will not proceed.
- `applied`: a separate controlled versioning/publication workflow recorded that it was applied.

There is intentionally no E5 apply or publish action in this phase.

## Validation and historical protection

Proposal validation is designed to reuse E4 concepts: completeness, structured rubrics totaling 100, passing score, Core XP, unlock constraints, ARIA evidence, career context, Lab readiness, media requirements, duplicates, and publication conflicts.

E5 does not write `lesson_progress`, `submissions`, `xp_ledger`, or `enrollments`. Future application must preserve evidence-bearing UUIDs and use staging/versioning rather than destructive replacement.

## Known Module 1 state

The Module 1 demonstration displays the known E3 discrepancy: the reviewed draft Core Challenge is missing while the legacy published `Breath Control Studio Challenge` remains. E5 analyzes this condition but does not manufacture, insert, edit, or publish the missing activity.

## Manual deployment sequence

1. Review forward migration `202608090008_phase_e5_curriculum_intelligence.sql`.
2. Record historical table counts and current curriculum UUIDs.
3. Apply the forward migration manually in Supabase.
4. Run `202608090008_phase_e5_curriculum_intelligence_validation.sql`.
5. Confirm RLS is enabled, anonymous privileges are false, and only the expected authenticated grants exist behind admin-only policies.
6. Configure no AI secret for the mock foundation.
7. Deploy a preview and test using an administrator account.

The rollback refuses to remove the schema once source or proposal records exist. Export and preserve authoring records before any later rollback decision.
