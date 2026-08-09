# Build 2.5 Phases A-C — Academy-native enrollment access

## Scope

This phase changes only the authoritative student course-access path. It does not implement Google Sheet synchronization, four-level curriculum authoring, ARIA generation, or new reporting/admin features.

## Reused infrastructure

- `profiles.id = auth.users.id` preserves the authenticated student UUID.
- `enrollments` remains the single Academy course relationship and retains its unique `(student_id, course_id)` constraint, historical progress, XP, teacher, and timestamps.
- Canonical `courses`, `course_modules`, `lessons`, and `lesson_progress` remain unchanged.
- Existing curriculum and lesson-progress RLS continues calling `jpac_student_has_course_access(course_id)`.
- Existing Enrollment Manager can create or update the test enrollment through its admin-authorized RPC.
- Wix member, entitlement, plan-map, order, and program tables are preserved unchanged for compatibility and history.

## New access path

`auth.uid()` → `enrollments.student_id` → active/date-valid enrollment → published `courses.id` → modules → lessons → own `lesson_progress`

Only `status='active'` grants normal student access. Pending, paused, completed, cancelled, withdrawn, and expired rows retain history but do not grant access.

## Additive schema

`enrollments` gains:

- `end_date date`
- `level integer` constrained to 1–4, default 1
- `enrollment_source text`, default `academy`
- `last_synchronized_at timestamptz`
- partial active student/course index

No existing rows, UUIDs, progress, courses, Wix records, or audit history are deleted.

## RPCs

- `jpac_student_has_course_access(uuid)` retains its signature and staff bypass, but student access now checks active Academy enrollment instead of Wix entitlement/mapping.
- `jpac_my_academy_courses()` is the canonical student list and derives identity exclusively from `auth.uid()`.
- `jpac_my_entitled_courses()` remains installed for compatibility/history but has no production client caller after this phase.

## Deployment order

1. Back up and inspect production `enrollments`, course UUIDs/statuses, and current policies.
2. Apply `202608080100_build_2_5_academy_enrollment_access.sql`.
3. Run its validation SQL.
4. Create the test student’s active Singing enrollment using the existing Enrollment Manager or the reviewed SQL below.
5. Deploy the frontend.
6. Validate My Academy, direct course/module/lesson URLs, progress writes, inactive enrollment denial, staff access, and cross-student isolation.

## Exact test-student enrollment method

Preferred normal operation:

1. Sign in as an admin/developer.
2. Open **Enrollment Manager**.
3. Select the existing authenticated student.
4. Select the existing canonical Singing course.
5. Choose `active`, Level 1, and the intended start date.
6. Complete enrollment. The existing `enrollment_manager_create` RPC upserts on `(student_id, course_id)` and does not duplicate the relationship.

For a reviewed production SQL operation, resolve both UUIDs from exact canonical records and stop if either is ambiguous:

```sql
begin;

do $$
declare
  student_uuid uuid;
  singing_uuid uuid;
begin
  select p.id into strict student_uuid
  from public.profiles p
  where lower(p.email)=lower('REPLACE_WITH_TEST_STUDENT_EMAIL');

  select c.id into strict singing_uuid
  from public.courses c
  where c.slug='singing';

  insert into public.enrollments(
    student_id,course_id,status,start_date,end_date,level,
    enrollment_source,last_synchronized_at,updated_at
  ) values(
    student_uuid,singing_uuid,'active',current_date,null,1,
    'academy',now(),now()
  )
  on conflict(student_id,course_id) do update set
    status='active',
    start_date=excluded.start_date,
    end_date=null,
    level=1,
    enrollment_source='academy',
    last_synchronized_at=now(),
    updated_at=now();
end $$;

select e.id,e.student_id,e.course_id,e.status,e.start_date,e.end_date,e.level,
       e.enrollment_source,c.slug,c.status as course_status
from public.enrollments e
join public.courses c on c.id=e.course_id
join public.profiles p on p.id=e.student_id
where lower(p.email)=lower('REPLACE_WITH_TEST_STUDENT_EMAIL')
  and c.slug='singing';

commit;
```

This does not invent enrollment: staff must replace the email only after confirming the student should be enrolled in Singing. `INTO STRICT` prevents silent selection of zero or multiple records.

## Deferred Phase D+

- Authenticated/idempotent Google Sheet ingestion endpoint or scheduled worker.
- Stable Sheet row/source identifier and synchronization audit history.
- Email normalization, profile matching, course-slug resolution, validation/error queue, and retry behavior.
- Admin-visible sync state and normal operational controls.
- Four-level curriculum entities and approved ARIA draft workflow.
- Canonical enrollment and learning-record reporting views.
