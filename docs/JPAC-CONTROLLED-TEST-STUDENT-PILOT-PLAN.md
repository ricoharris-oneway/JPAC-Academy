# JPAC Controlled Test-Student Pilot Plan

## Purpose

Validate the existing JPAC student and teacher workflow with a small internal group before any public launch. The pilot tests the approved Singing Beginner Module 1 experience only; it does not approve or publish draft curriculum.

## Scope

- 3 to 5 internal test students using dedicated non-paid test accounts.
- One designated teacher/reviewer and one administrator/observer.
- Singing, Beginner, Module 1 only.
- One controlled pass through login, content, progress, media area, Core Challenge submission, teacher review, XP/mastery, completion, unlock, persistence, and logout/login.
- Read-only SQL preflight before testing and read-only post-validation afterward.

## Allowed

- Use explicitly approved internal test accounts and supplied fictional test evidence.
- Access the existing published Singing Beginner Module 1 pilot.
- Record screenshots, timestamps, expected/actual outcomes, and issue severity.
- Submit and review the approved pilot Core Challenge through the existing application workflow.
- Stop immediately when a blocker or data-safety concern appears.

## Not allowed

- Public, paid, or real student participation.
- Creating accounts or enrollments without separate human authorization.
- Publishing draft courses or modules, changing access policies, or exposing draft content.
- Certificate testing or issuance.
- Production-data cleanup, direct SQL mutation, manual XP edits, or bypassing application workflows.
- Testing another course, another Singing module, external tools, or unapproved media.

## Participant criteria

Test students must be internal, consent to testing and screenshots, use dedicated test credentials, avoid personal/sensitive evidence, and be able to report defects clearly. The teacher/admin must understand the approved rubric, use the normal review interface, avoid direct database edits, monitor access and state changes, and have authority to stop the pilot.

## Pass/fail criteria

Pass requires every critical smoke-test step to succeed, no draft course or module exposure, no certificate creation, correct submission/review/XP/mastery/completion behavior, expected unlock behavior, preserved state after re-login, and a post-validation result with no `BLOCK` rows. Warnings must be understood and accepted as internal-pilot-only constraints.

Fail or stop immediately for unauthorized access, draft publication or visibility, certificate creation, cross-student data exposure, incorrect XP/mastery, missing submission evidence, destructive behavior, protected baseline drift, Assignment Swap failure, unexpected media/tool activation, or any issue rated Critical.

## Stop and recovery rules

1. Stop all testers; do not retry destructive or ambiguous steps.
2. Preserve screenshots, timestamps, account IDs, URLs, and issue details without exposing credentials.
3. Notify the designated administrator and technical owner.
4. Do not run cleanup SQL or delete evidence.
5. Revoke or disable test access only through a separately approved operational action.
6. Diagnose, fix through the normal change-control process, rerun readiness/preflight checks, and obtain a new go decision.

## Issues log format

| ID | Time | Tester | Step | Expected | Actual | Severity | Screenshot/link | Owner | Status |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| PILOT-001 |  |  |  |  |  | Critical/High/Medium/Low |  |  | Open |

## Final recommendation

Use one of:

- `GO — controlled internal pilot scope passed; public launch remains prohibited.`
- `CONDITIONAL GO — no blockers; listed warnings require owner acceptance and follow-up.`
- `NO-GO — one or more blockers or critical issues; stop and remediate before retest.`

Record the decision, approver, date/time, blocker count, warning count, unresolved issues, allowed next scope, and explicitly prohibited next actions.
