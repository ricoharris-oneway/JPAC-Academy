# Build 2.1 Production Deployment

> After Build 2.1 succeeds, deploy Build 2.3 using [BUILD-2.3-REMEDIATION.md](./BUILD-2.3-REMEDIATION.md). Do not schedule its notification worker until the provider adapter and server-only secrets are configured.

## Scope and release gate

Build 2.1 hardens Authentication Milestone 1 and Student Access Milestone 2. It adds no student feature. Do not mark either milestone production-complete until a new production Wix purchaser completes invitation, password setup, login, entitled course access, progress isolation, and staff-regression testing.

Use a maintenance window or low-traffic period for Stage 2. Stage 1 is additive and does not alter curriculum RLS. Stage 2 replaces selected policies in one migration transaction and contains gates that abort before policy changes if production status review or plan mapping is incomplete.

## Production migration audit

The retired `202608070001_student_course_access.sql` used normalized display titles for authorization and is not safe for production execution. It has been replaced by two ordered forward migrations:

| Stage | Migration | Effect on data and access |
| --- | --- | --- |
| 1 | `202608070101_student_access_hardening_prepare.sql` | Adds mapping/status configuration, status discovery, and explicit-ID functions. It inserts configuration rows only; it does not update or delete users, profiles, Wix links, entitlements, curriculum, or progress and does not replace curriculum policies. |
| 2 | `202608070102_student_access_hardening_enforce.sql` | After validation gates pass, replaces only published course/module/lesson read policies and two lesson-progress write policies. Existing staff management/read policies are not removed; `is_staff()` remains in both modified progress policies. |

Both stages are safe to run once and are idempotent where practical. They contain no `DROP TABLE`, `TRUNCATE`, user deletion, identity rewrite, entitlement rewrite, or foreign-key rewrite. Policy/function/trigger drops are targeted `DROP ... IF EXISTS` operations used to make the intended definitions repeatable.

## Pre-deployment checklist

- [ ] Confirm the deployment branch and reviewed commit SHA; do not deploy from `main` before exit gates.
- [ ] Confirm production application origin, for example `https://academy.example.com`.
- [ ] Supabase Authentication → URL Configuration: set Site URL to the production Academy origin.
- [ ] Add `https://academy.example.com/auth/callback` to Redirect URLs. Keep required preview URLs separate; remove production `localhost` entries and production environment variables that contain localhost.
- [ ] Confirm Wix provisioning sends the exact production callback in `redirectTo`, with `/auth/callback?next=%2Fset-password`.
- [ ] Confirm production `VITE_SUPABASE_URL` is the intended project URL and `VITE_SUPABASE_ANON_KEY` is the public anon key. Never expose the service-role key to Vite or the browser.
- [ ] Export/snapshot row counts for `auth.users`, `profiles`, `wix_member_links`, and `wix_access_entitlements` using the validation SQL.
- [ ] Export current policies from `pg_policies` for `courses`, `course_modules`, `lessons`, and `lesson_progress`.
- [ ] Take the normal managed database backup/PITR checkpoint and record its timestamp.
- [ ] Query `supabase_migrations.schema_migrations` for versions `202608070001`, `202608070101`, and `202608070102`. If retired version `202608070001` was ever applied in this production project, stop and perform a database-state review before continuing; do not assume the replacement objects exist.
- [ ] Run build, TypeScript, repository whitespace checks, secret scan, and available tests on the exact release commit.

## Forward deployment

### 1. Apply Stage 1

Run `supabase/migrations/202608070101_student_access_hardening_prepare.sql` in the production project. Do not apply Stage 2 yet.

Stage 1 automatically discovers all statuses already stored in `wix_access_entitlements`. Known compatible values are seeded as reviewed access-granting values; every unknown value is inserted unreviewed and fail-closed. The trigger continues discovering future values automatically.

### 2. Review every discovered status

```sql
select r.status,r.grants_access,r.reviewed_at,r.description,count(e.id) entitlement_count
from public.wix_entitlement_status_rules r
left join public.wix_access_entitlements e on lower(trim(e.status))=r.status
group by r.status,r.grants_access,r.reviewed_at,r.description
order by r.status;
```

For each unreviewed status, confirm its meaning against the current Wix event/order contract. Explicitly approve or deny it; do not infer access from its wording:

```sql
update public.wix_entitlement_status_rules
set grants_access = false, -- set true only after an authoritative Wix review
    reviewed_at = now(),
    updated_at = now(),
    description = 'Reviewed YYYY-MM-DD: REASON'
where status = 'EXACT_NORMALIZED_STATUS';
```

### 3. Populate explicit Wix plan IDs

First inventory exact IDs already received from Wix:

```sql
select e.wix_plan_id,e.plan_name,count(*) entitlement_count,
       array_agg(distinct lower(trim(e.status))) statuses
from public.wix_access_entitlements e
group by e.wix_plan_id,e.plan_name
order by e.plan_name,e.wix_plan_id;

select id,slug,title,status from public.courses order by title;
```

Insert an operator-reviewed mapping for every access-granting production plan. Use IDs from Wix payloads/API and `courses.id`; never derive them from titles:

```sql
insert into public.wix_plan_course_map(wix_plan_id,course_id,active,updated_at)
values
  ('EXACT_WIX_PLAN_ID','EXACT_COURSE_UUID',true,now())
on conflict(wix_plan_id) do update
set course_id=excluded.course_id,active=excluded.active,updated_at=now();
```

Multiple Wix plans may map to one course. One Wix plan ID maps to exactly one course. The existing `wix_program_course_map` is not replaced or modified.

### 4. Run validation

Run all of `supabase/validation/202608070101_student_access_hardening_validation.sql`. Save its output with the deployment record. Every result marked `EXPECT ZERO` must have zero rows. Confirm pre-deployment identity counts are unchanged.

Use the auth-context template at the end of the validation file for:

- a current entitled student;
- an expired/cancelled student;
- a student with two valid plans;
- a student with no plan; and
- teacher, admin, and developer accounts.

### 5. Deploy application and preview-test callback

Deploy the exact reviewed build to preview. Test a fresh invite and recovery link. Expected sequence:

`Supabase email → https://PRODUCTION_ORIGIN/auth/callback?... → /set-password → /`

PKCE `?code=` links and legacy implicit `#access_token=...&refresh_token=...` links are both supported. Callback credentials must disappear from browser history immediately. Invite and recovery flow types go to `/set-password`; verification and magic-link flows go to the safe requested route.

### 6. Apply Stage 2

After Stage 1 validation and preview tests pass, run `supabase/migrations/202608070102_student_access_hardening_enforce.sql`. Its preflight block aborts before dropping policies if any real status is unreviewed or any current access-granting entitlement lacks an active plan mapping.

Re-run the full validation SQL. Confirm the entitled policies exist, RLS is enabled, staff management policies remain, progress policies contain `is_staff()`, and identity counts match the baseline.

## Live end-to-end validation

Use a never-before-seen email and a real production Wix purchase/order event.

1. Complete the configured Wix purchase/pricing-plan action that invokes the existing server-side member/order provisioning endpoint. Capture Wix member ID, order ID, plan ID, event ID, HTTP response, and timestamp.
2. Verify one `auth.users` row exists and its UUID matches `profiles.id`; verify `profiles.role='student'` unless a pre-existing role legitimately applies.
3. Verify one `wix_member_links` row connects the exact Wix member ID to that profile and `wix_access_entitlements` contains the exact order and plan IDs.
4. Confirm the invite email link host is the production Academy host, not localhost, and opens `/auth/callback`.
5. Confirm callback redirects to `/set-password`, password submission succeeds through `supabase.auth.updateUser()`, and the user reaches the Academy.
6. Sign out and sign in with the new password. Confirm only explicitly mapped, current purchased courses appear and direct access to an unpurchased course is denied.
7. Open and update a purchased lesson. Verify `lesson_progress.student_id` is the new user's UUID.
8. Test an expired entitlement, two valid entitlements, and no entitlement.
9. Sign in as teacher, admin, and developer. Confirm curriculum/course access and existing staff progress reads/writes still work.
10. Attempt a direct Supabase read/write using another student's UUID. RLS must return no foreign progress and reject foreign writes.

Useful identity query:

```sql
select u.id,u.email,u.invited_at,u.email_confirmed_at,u.last_sign_in_at,
       p.role,p.display_name,l.wix_member_id,
       e.wix_order_id,e.wix_plan_id,e.plan_name,e.status,e.starts_at,e.ends_at
from auth.users u
left join public.profiles p on p.id=u.id
left join public.wix_member_links l on l.profile_id=u.id
left join public.wix_access_entitlements e on e.profile_id=u.id
where lower(u.email)=lower('NEW_PRODUCTION_TEST_EMAIL');
```

## Rollback checklist

- [ ] Stop/disable the release deployment or restore the prior application artifact.
- [ ] Capture the failing request, affected user/course/plan IDs, database error, browser console, network trace, and Supabase/Wix log timestamps before changing state.
- [ ] If Stage 2 was applied, run `supabase/rollbacks/202608070102_student_access_hardening_enforce_rollback.sql` first. This restores the original curriculum and progress policy definitions without changing records.
- [ ] Re-run policy and identity sections of the validation SQL; verify original published access and all staff permissions.
- [ ] Only if Stage 1 behavior must also be disabled, run `supabase/rollbacks/202608070101_student_access_hardening_prepare_rollback.sql`. It removes the trigger/functions but deliberately retains mapping and status tables so production decisions/history are not lost.
- [ ] Restore the previous application artifact if it has not already been restored.
- [ ] Re-test login, existing users, staff pages, course reads, and progress.
- [ ] Record rollback time, operator, reason, scripts, row counts, and follow-up owner.

Do not drop `wix_plan_course_map` or `wix_entitlement_status_rules` during an incident. If a later full schema removal is approved, export them first and use a separately reviewed destructive migration.

## Troubleshooting evidence

Capture exact timestamps, environment/release SHA, affected email/profile UUID, Wix member/order/plan/program IDs, URL path with tokens and codes redacted, and correlation/event IDs. Never paste access tokens, refresh tokens, authorization codes, passwords, service-role keys, webhook secrets, or full invite links into tickets.

### Invite opens localhost or the wrong host

- Capture the redacted email hyperlink host/path, Supabase Auth log event, Wix provisioning request `redirectTo`, and deployed origin.
- Check Supabase Site URL and Redirect URL allowlist. Supabase silently falls back when a redirect is not allowed.
- Search the production build/environment and repository for `localhost`, `127.0.0.1`, and development callback origins.

### Callback reports invalid/expired link

- Capture redacted callback query-key names (`code`, `type`, `error`, not values), hash-key names, browser console, and Auth log exchange error.
- Confirm the link was used once and has not expired. Generate a new invite/recovery rather than reusing it.
- Confirm the deployed client has `detectSessionInUrl:false`; the callback must be the sole code exchanger.

### Password update fails

- Capture `updateUser` error code/message, Auth log entry, current route, flow type, and whether `getSession()` returned a session (do not capture tokens).
- Confirm the callback established a session and routed invite/recovery to `/set-password`.

### Course missing or incorrectly locked

- Run the status inventory, mapping coverage, and auth-context sections of validation SQL.
- Capture profile UUID, entitlement ID, exact Wix plan ID/status, dates, mapping row, course UUID/status, and RPC error.
- Do not fix this by title matching. Correct the explicit plan mapping or reviewed status decision.

### Unknown Wix status appears

- The trigger records it with `grants_access=false` and `reviewed_at=null`; this is expected fail-closed behavior.
- Capture the Wix event type/version, redacted payload fields, status, order/plan ID, and timestamp. Review against authoritative Wix semantics, then explicitly approve or deny.

### Staff loses access

- Capture role/profile UUID, route, table operation, PostgREST error, and the `pg_policies` validation output.
- Confirm `staff manage courses`, module/lesson staff policies, and staff progress read policy still exist; confirm modified progress insert/update policies include `is_staff()`.
- If production work is blocked, execute the Stage 2 rollback and verify before investigating further.

### Suspected cross-student access

- Treat as a security incident. Preserve audit/Auth/PostgREST logs and revoke affected sessions if required by the incident process.
- Capture requester UUID, target UUID, table/RPC, operation, timestamp, response status, and release SHA without exposing record content beyond authorized responders.
- Roll back Stage 2 only if incident leadership determines the new policies caused the regression; the original policies must still prevent foreign `lesson_progress` access through `auth.uid()`/`is_staff()`.
