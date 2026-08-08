# Milestone 2: Student Enrollment and Course Access

Milestone 2 reuses the Academy's existing identity, Wix access, curriculum, progress, and XP structures. It is not production-complete until a real entitled student opens a purchased course in production.

## Current-state assessment

Before this milestone, `/courses` rendered the static `launchCourses` array and every course action opened the Creative Studio. The primary dashboard read `enrollments`, which is not guaranteed to be created by a Wix purchase, while the canonical Wix records already lived in `wix_access_entitlements` and `wix_program_enrollments`. Published courses, modules, and lessons were readable by every authenticated user regardless of entitlement.

## Canonical data path

`auth.users.id → profiles.id → wix_member_links.profile_id → wix_access_entitlements.profile_id`

Course access is resolved server-side by `jpac_student_has_course_access(course_id)`. `jpac_my_entitled_courses()` supplies the dashboard and My Courses page. Course content uses `courses → course_modules → lessons`; official lesson state uses `lesson_progress`.

## Wix plan mapping

Mapping is centralized in `jpac_course_access_key(text)`. It removes the `JPAC -` prefix and normalizes the supported names:

| Wix plan | Course access key |
| --- | --- |
| JPAC - Singing | singing |
| JPAC - Piano | piano |
| JPAC - Acting | acting |
| JPAC - Dance | dance |
| JPAC - Guitar | guitar |
| JPAC - Audio Engineering | audio-engineering |
| JPAC - Video Production | video-production |
| JPAC - Songwriting | songwriting |
| JPAC - Music Business | music-business |
| JPAC - Artist Development | artist-development |

The existing `wix_program_course_map` is honored when a synchronized program title matches the plan and its Wix program ID has an explicit course mapping. Otherwise, the normalized plan name must match the published course title.

## Access rules

A student receives access only when the entitlement belongs to `auth.uid()`, has `active`, `trialing`, `trial`, or `free_trial` status, has started, has not expired, and maps to the requested published course. Staff retain curriculum access through existing staff policies. Entitlement enforcement is in RLS/security-definer functions, not only in React.

## Progress

Opening a lesson creates an owned `lesson_progress` row with `in_progress`; completing it updates the row to `completed` and 100%. The existing schema has no operational prerequisite/unlock rule, so modules and lessons are shown in canonical `sort_order` without inventing a second sequencing engine. Program-level progress prefers `student_learning_state`, then Wix program progress, then canonical enrollment progress.

## Missing canonical data

- Courses have no canonical image field, so the UI uses a neutral Academy course icon rather than fabricating program artwork.
- There is no separate course-level model; `courses.difficulty` is displayed when present, while modules and lessons remain the actual hierarchy.
- Recently accessed course state is derived from the latest `lesson_progress.updated_at`; there is no separate course-visit table.
- Course and lesson descriptions plus `wix_lesson_url` are the available lesson content fields. Rich native lesson bodies are not present.

## Production validation

1. Apply `202608070001_student_course_access.sql` to the production Supabase project.
2. Confirm each supported Wix plan title maps to exactly one published `courses` row, or configure `wix_program_course_map` for its synchronized Wix program.
3. Sign in as an entitled student and confirm My Courses shows only the purchased active/trialing programs.
4. Open a course, a module, and a lesson; confirm the lesson content or Wix lesson link loads.
5. Confirm `lesson_progress.student_id` equals the authenticated profile and the selected lesson ID.
6. Mark the lesson complete and confirm `status='completed'` and `percent_complete=100`.
7. Sign in as a no-plan student and confirm the empty state.
8. Test expired and cancelled entitlements and confirm direct course URLs show the locked state.
9. Test two active plan entitlements and confirm exactly two mapped courses appear.
10. Confirm a student cannot select another profile's entitlements/progress and cannot open an unentitled course through its direct URL or Supabase API.
11. Confirm teacher, admin, and developer pages still load and retain their roles.

Useful verification query:

```sql
select p.id,p.email,p.role,wml.wix_member_id,e.plan_name,e.status,e.starts_at,e.ends_at,
       public.jpac_course_access_key(e.plan_name) access_key
from public.profiles p
left join public.wix_member_links wml on wml.profile_id=p.id
left join public.wix_access_entitlements e on e.profile_id=p.id
where lower(p.email)=lower('STUDENT_EMAIL');
```

```sql
select lp.student_id,lp.lesson_id,lp.status,lp.percent_complete,lp.started_at,lp.completed_at,lp.updated_at
from public.lesson_progress lp
where lp.student_id=(select id from public.profiles where lower(email)=lower('STUDENT_EMAIL'))
order by lp.updated_at desc;
```
