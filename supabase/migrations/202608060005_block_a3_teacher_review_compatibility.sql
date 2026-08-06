-- Keep the existing Teacher Studio UI unchanged while routing its current RPC
-- through the completed Block A3 approval automation.

create or replace function public.teacher_review_submission(
  submission_target uuid,
  review_status text,
  review_score numeric default null,
  review_feedback text default null
)
returns jsonb
language sql
security definer
set search_path=public
as $$
  select public.jpac_review_submission(
    submission_target,
    review_status,
    review_score,
    review_feedback
  );
$$;

grant execute on function public.teacher_review_submission(uuid,text,numeric,text) to authenticated;
