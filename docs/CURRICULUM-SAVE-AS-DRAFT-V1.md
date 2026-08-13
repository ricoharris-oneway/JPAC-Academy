# Curriculum Save as Draft v1 — Backend Review Artifact

## Boundary

Save as Draft v1 is a narrow administrative RPC proposal. It accepts one `jpac-curriculum-export` `1.2.0` **module-scope** payload and may create exactly one previously nonexistent draft module, three draft lessons, zero or one optional draft Practice, and one required draft Core Challenge. It does not implement frontend wiring in this batch.

It does not support level or course scope, reuse, overwrite, update, upsert, delete, publish, promotion, student data, evidence, submissions, review decisions, XP ledger entries, certificates, active media, Lab bindings, Career Path activation, or academic workflow calls.

## RPC contract

Signature: `public.curriculum_save_module_as_draft_v1(import_payload jsonb) returns jsonb`.

The payload is the module export envelope plus:

- `target_course_id`: UUID of the already selected canonical course.
- `acknowledged_warning_codes`: every source warning code the administrator explicitly reviewed.

The envelope must use `contract = jpac-curriculum-export`, `contract_version = 1.2.0`, `export_scope.type = module`, `options.include_database_ids = false`, and matching course slug, level number, and module number identities. Unknown top-level fields and unsupported nested fields are rejected. Imported database IDs are rejected rather than trusted.

## Authorization and transaction behavior

The function is `SECURITY DEFINER`, uses `search_path=public`, and is callable through the repository's established `authenticated` RPC wrapper pattern. The first executable guard requires `auth.uid()` and `public.is_admin()`, whose current definition admits only app roles `admin` and `developer`. `anon` and `public` receive no execute grant.

One function call is one PostgreSQL transaction. The target level row is locked before the module identity check. The existing unique `(course_level_id, level_module_number)` index remains authoritative. Any validation error aborts the whole call, so partial module/lesson/activity creation cannot commit.

## Canonical validation

- The selected course UUID and slug must resolve to exactly one existing course.
- The requested level must already exist in that course.
- The requested module identity and course-wide sort order must not exist.
- Exactly three draft lessons are required.
- Zero or one draft Practice is accepted; it must be optional, `practice`, zero XP, `bonus`, and non-assessed.
- Exactly one draft Core Challenge is required; it must be required, `performance`, 350 XP, `core`, pass at 70, permit resubmission, and contain five named criteria totaling 100 with `Exceeds`, `Meets`, `Developing`, and `Not Yet` bands.
- Module XP must be exactly `50 / 100 / 350 / 125 = 625`, unlock threshold `438`, and passing score `70`.
- All export warning codes must be explicitly acknowledged. Acknowledgement does not repair or approve the source.

## Review-only media, tool, and Career Path handling

Media must be `NEEDS_REVIEW`, contain zero media versions, and have no legacy URL. The RPC inserts no `module_instructional_media` row and leaves `primary_video_url` and `active_instructional_media_id` null.

Tools must be `NEEDS_CATALOG_REVIEW` with a null catalog reference. The RPC inserts no Lab record or binding and leaves `lab_tool_id` null. Career Path attachments must be `NOT_CONFIGURED` with an empty item list and create no Career Path records.

## Return value

On success the RPC returns a generated operation ID, the created module/lesson/activity IDs, status `draft`, created counts, and unresolved review statuses. The operation ID is a response correlation value only; v1 does not add an operation/audit table.

## Safe Draft Isolation and preservation

Preflight requires the published-only progress functions and enabled canonical enrollment trigger. Draft records therefore remain outside student progress denominators. The RPC does not reconcile progress and calls no XP, mastery, unlock, submission, teacher-review, certificate, media-progress, or enrollment function.

Singing is not named or modified by the function. Preflight and post-validation emit comparable Singing curriculum hashes, protected function hashes, and student-state row counts. Reviewers must stop if these baselines differ unexpectedly.

## Execution and recovery order

These files are review artifacts and are not authorized for execution by their creation:

1. Run `202608130002_curriculum_save_module_as_draft_v1_preflight.sql` read-only and review every baseline.
2. Install `202608130002_curriculum_save_module_as_draft_v1.sql` only after explicit approval.
3. Run `202608130002_curriculum_save_module_as_draft_v1_post_validation.sql` read-only and compare baselines.
4. If capability installation is defective, run the rollback to revoke and drop only the RPC.

Rollback intentionally does **not** delete created drafts. Once the RPC has created curriculum, automatic deletion would be unsafe because later evidence or dependencies may exist. Any cleanup needs a separate, exact-ID, evidence-aware, explicitly approved recovery artifact.

## Stop conditions

Stop before installation or invocation if Safe Draft Isolation is absent; the trigger is disabled; `is_admin()` is missing; schema columns or the semantic identity index are missing; Singing/protected hashes drift; the target identity is ambiguous; any module already occupies the identity or sort order; warnings are unacknowledged; IDs, media/tool bindings, Career Path items, student/evidence fields, noncanonical XP, active statuses, extra activities, or an invalid rubric appear.

## Explicitly deferred

Frontend wiring, Save button enablement, level/course imports, reuse, conflict resolution, assignment swaps, versioning, import audit persistence, publishing, media review, tool catalog review, Career Path attachment, reconciliation, and automated cleanup remain future work.
