begin;

-- Non-destructive rollback: the E3 columns are additive authoring metadata and
-- are intentionally retained so reviewed curriculum work is never discarded.
-- Older application versions ignore these fields safely. No RLS, function,
-- trigger, XP, progression, or publication behavior requires reversal.

commit;
