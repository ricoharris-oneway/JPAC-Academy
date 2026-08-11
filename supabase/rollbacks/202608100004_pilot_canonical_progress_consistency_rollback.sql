begin;

drop trigger if exists enrollments_enforce_canonical_progress on public.enrollments;
drop trigger if exists xp_ledger_sync_canonical_progress on public.xp_ledger;
drop trigger if exists submissions_sync_canonical_progress on public.submissions;
drop function if exists public.jpac_sync_progress_after_assessment();
drop function if exists public.jpac_sync_progress_from_mastery_ledger();
drop function if exists public.jpac_enforce_canonical_enrollment_progress();
drop function if exists public.jpac_sync_enrollment_progress(uuid,uuid);

comment on column public.enrollments.progress is null;

-- Corrected progress projections are intentionally preserved. Restoring stale
-- pre-migration percentages would discard a valid reconciliation result.
commit;
