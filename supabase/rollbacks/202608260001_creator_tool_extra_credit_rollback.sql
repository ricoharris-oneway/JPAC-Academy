begin;
drop trigger if exists creator_tool_extra_credit_log_submission on public.creator_tool_extra_credit_submissions;
drop trigger if exists creator_tool_extra_credit_updated_at on public.creator_tool_extra_credit_submissions;
drop function if exists public.creator_tool_extra_credit_log_submission();
drop function if exists public.creator_tool_extra_credit_withdraw(uuid);
drop function if exists public.creator_tool_extra_credit_review(uuid,text,text);
drop table if exists public.creator_tool_extra_credit_submission_events;
drop table if exists public.creator_tool_extra_credit_submissions;
commit;
