# Piano Full 48-Module Draft Rollout

Review-only five-file rollout derived from [PIANO-48-MODULE-SOURCE-MAP.md](./PIANO-48-MODULE-SOURCE-MAP.md). It reuses the canonical Piano course and exact existing Module 1, then creates only missing draft Levels 2-4 and the remaining 47 modules.

## Intended final structure

- 4 levels; 48 modules; 144 lessons; 48 optional zero-XP practices; 48 required 350-XP Core Challenges; 240 rubric criteria.
- All created curriculum remains draft. Media is inactive/NEEDS REVIEW, tools are unbound/NEEDS CATALOG REVIEW, and Career Paths remain NOT CONFIGURED.
- Locked module XP remains 50/100/350/125 = 625, unlock threshold 438, passing score 70. PDF points are never XP.

## Deferred metadata

The rollout does not update courses.module_count, courses.core_xp_total, or course_levels.core_xp_target. Piano's 48-module/30,000-XP metadata requires a separate narrow review because the current course constraint fixes core_xp_total at 25,000. No shared XP behavior changes here.

## Execution order

1. Run preflight read-only and stop unless final readiness is PASS.
2. Run the migration only after human content and SQL review.
3. Run post-validation and compare protected baselines retained from preflight/manual review.
4. Run rollback only if needed; it stops on evidence or payload drift.

## Stop conditions and limitations

Stop for ambiguous Piano identity, Module 1 drift, inactive published-only isolation, conflicting level/module identities, incompatible existing children, evidence-bearing dependencies, unexpected media/Lab bindings, or any Singing/shared-function drift. Rollback never deletes the Piano course or Module 1. Exact reuse cannot be distinguished from a prior successful execution without a new tracking table; deterministic IDs plus the batch review-note marker bound rollback candidates. This artifact intentionally creates no tracking/import architecture.

No SQL has been executed by artifact creation.
