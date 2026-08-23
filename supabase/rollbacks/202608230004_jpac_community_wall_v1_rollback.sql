-- Roll back only JPAC Community Wall v1 tables and their dependent indexes/policies.
-- This does not touch profiles, users, curriculum, enrollments, submissions,
-- certificates, progress, XP, Assignment Swap, or any other application data.
begin;

drop table if exists public.community_moderation_actions;
drop table if exists public.community_reports;
drop table if exists public.community_reactions;
drop table if exists public.community_comments;
drop table if exists public.community_posts;

commit;
