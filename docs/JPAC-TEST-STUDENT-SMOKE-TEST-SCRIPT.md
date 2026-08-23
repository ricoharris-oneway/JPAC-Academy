# JPAC Test-Student Smoke-Test Script

## Preconditions

- Human approval identifies 3–5 internal test students, dedicated accounts, one teacher/reviewer, and one administrator.
- The readiness audit and pilot preflight have no `BLOCK` findings.
- Testers are instructed to use fictional, non-sensitive evidence.
- No public/paid students, draft-course publication, certificates, or unapproved tools/media are in scope.

For every step, record timestamp, tester, `PASS`/`FAIL`, expected versus actual behavior, notes, and the requested screenshot. Stop on unauthorized access, certificate creation, draft visibility, cross-student exposure, or incorrect state mutation.

## Student flow

1. Log in with the approved internal test-student account. Capture the successful landing page without credentials.
2. Check course visibility. Capture the catalog/dashboard.
3. Confirm only approved student-facing course/module access is visible; no draft program or draft module may be accessible.
4. Open **Singing**.
5. Open **Beginner Module 1 — Breath, Alignment & Vocal Health**. Capture title and availability.
6. View each published lesson and confirm content renders without exposing draft lessons.
7. Complete intro/lesson progress where the existing interface permits; record state before and after.
8. View the instructional media/video area where applicable. Do not attach, activate, or substitute media.
9. Submit the required **Breath Control Studio Challenge** using approved fictional test evidence.
10. Confirm the student sees the correct submitted/pending-review status and cannot self-review.

## Teacher/admin flow

11. Log out of the student account and log in through the approved teacher/admin account.
12. Confirm the correct student submission is visible and no other student's private evidence is exposed.
13. Review the submission using the approved 100-point rubric and normal application controls; record score and outcome.
14. Confirm core XP and mastery update exactly once according to the canonical contract; no duplicate award is allowed.
15. Confirm module completion state matches the reviewed result and required component completion.
16. Confirm next-module unlock behavior matches the 438-point threshold and approved pilot rules; do not access draft-only content.

## Safety and persistence

17. Confirm no certificate was generated or displayed.
18. Confirm no draft course became visible.
19. Confirm no draft module became student-accessible or counted toward student-ready progress.
20. Log back into the test-student account and confirm submission, progress, XP, mastery, completion, and unlock state persisted correctly.

## Completion

Run the read-only post-validation, compare counts with the captured preflight baseline, complete the results template, log every issue, and obtain an explicit human go/no-go recommendation. This script does not itself create accounts, enroll students, submit work, or execute the pilot.
