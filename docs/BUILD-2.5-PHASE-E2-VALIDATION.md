# Build 2.5 Phase E2 validation

Phase E2 is a frontend experience layer over the Phase E1 learning engine. It adds no migration and does not change authoritative access, XP, review, submission, or mastery behavior.

## Production-safe database checks

Run the existing Phase E1 hotfix validation first:

`supabase/validation/202608090002_phase_e_video_percent_ambiguity_validation.sql`

Then run this read-only check:

```sql
begin transaction read only;

select count(distinct cl.id) as singing_levels,
       count(distinct m.id) as singing_modules,
       count(distinct m.id) filter(where m.core_xp=625) as modules_at_625_core_xp,
       sum(m.core_xp) as total_core_xp
from public.courses c
join public.course_levels cl on cl.course_id=c.id
join public.course_modules m on m.course_level_id=cl.id
where c.slug='singing';

select m.id,m.title,m.status,m.level_module_number,m.core_xp,
       m.core_unlock_threshold,m.bonus_xp_available,m.primary_video_url,
       count(distinct l.id) filter(where l.status='published') as published_lessons,
       count(distinct a.id) filter(where a.status='published' and a.required and a.xp_type='core') as core_challenges,
       count(distinct a.id) filter(where a.status='published' and not a.required and a.xp_type='bonus') as bonus_practices
from public.courses c
join public.course_levels cl on cl.course_id=c.id and cl.level_number=1
join public.course_modules m on m.course_level_id=cl.id
left join public.lessons l on l.module_id=m.id
left join public.activities a on a.module_id=m.id
where c.slug='singing'
group by m.id,m.title,m.status,m.level_module_number,m.core_xp,
         m.core_unlock_threshold,m.bonus_xp_available,m.primary_video_url
order by m.level_module_number;

select has_function_privilege('anon','public.jpac_module_completion(uuid,uuid)','execute') as anon_completion,
       has_function_privilege('authenticated','public.jpac_module_completion(uuid,uuid)','execute') as authenticated_completion,
       has_function_privilege('authenticated','public.jpac_award_module_core_component(uuid,uuid,text)','execute') as student_internal_xp_helper,
       has_function_privilege('authenticated','public.jpac_finalize_module_mastery(uuid,uuid)','execute') as student_internal_mastery_helper;

select policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in('course_modules','lessons','activities','submissions','xp_ledger')
order by tablename,policyname;

rollback;
```

Expected totals are `4`, `40`, `40`, and `25000`. Anonymous completion and both authenticated internal-helper privileges must be `false`; authenticated completion must be `true`.

## Existing enrolled Singing student

1. Sign in through the existing account/password flow.
2. Open My Academy, Singing, then published Beginner Mission 1.
3. Confirm Mission Progress, Mission Brief, Learn It, Watch It, Try It, JPAC Lab, Create It, ARIA Feedback, and Master It render.
4. Confirm existing lessons show their persisted status and open normally.
5. With no video configured, confirm the professional configuration state renders and the rest of the mission remains usable.
6. With an approved production video, confirm the displayed percentage matches `module_video_progress` and 89% does not complete the Watch step.
7. Confirm Core XP displays `earned / 625` and Bonus XP is shown separately.
8. Complete an optional practice once; refresh and confirm Bonus XP persists without changing Core completion.
9. Choose a real audio/video file, confirm its name and size, and submit it.
10. Confirm the new immutable attempt number appears and all earlier attempts remain visible.
11. Confirm a student cannot set score, status, reviewer, XP, or mastery through browser requests.
12. Review below the configured passing score as staff; confirm Revision Mission uses stored assessment feedback and supports another attempt.
13. Review a later attempt at or above the passing score; confirm the backend awards Core assignment XP once.
14. Confirm Master It reflects `jpac_module_completion` truth values rather than lesson/UI calculations.
15. Confirm the next published mission remains server-locked until completion and becomes available only after backend-confirmed mastery.
16. Refresh, sign out, and sign back in; confirm lesson, video, submission, assessment, XP, and unlock state persist.

## Regression checks

- An unenrolled student sees no Singing curriculum through direct table queries or direct routes.
- Draft modules remain hidden.
- Another student cannot read the enrolled student’s progress, XP, or submissions.
- Staff retain reviewed access.
- `/account`, password management, Home, My Academy, JPAC Lab, My Growth, and Curriculum Studio retain their existing route behavior.

Manual checks must not be marked passed until executed against the preview and production Supabase project.
