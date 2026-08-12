# Piano Beginner Level 1 — Module 1 Draft Configuration

Status: review only. SQL has not been executed. Student access, publication, media activation, Lab binding, Career Pathing, and enrollment changes are out of scope.

## Source mapping

The primary Piano Program source defines Module 1 as **Piano Posture and Hand Position**. Its purpose is to establish safe beginner setup and hand technique through a virtual-piano task, tuner observation, metronome-supported five-finger practice, and reflection. The Piano Tutor supports seating position, curved fingers, relaxed wrists, healthy habits, finger placement, wrist-tension feedback, and finger-collapse feedback.

Source cleanup decisions:

- Google Classroom becomes the existing JPAC submission workflow.
- The source video is **NEEDS REVIEW** and is not stored or activated.
- Virtual Piano, Instrument Studio, and Smart Metronome are **NEEDS CATALOG REVIEW** and remain documentation-only.
- Instrument Tuner is not required for mastery unless leadership later confirms its relevance.
- An approved five-finger pattern replaces five full scales unless a piano teacher restores that requirement.
- CapCut and Cakewalk are not required.
- Source assignment points are assessment source material, not JPAC XP.

## AI-proposed content disclosure

Lesson objectives, instructional blocks, completion expectations, accessibility alternatives, challenge criteria, rubric bands, and ARIA wording completed from source gaps are **AI-PROPOSED — LEADERSHIP AND PIANO-TEACHER REVIEW REQUIRED**.

## Canonical draft manifest

- Existing course: `piano` (reused; never inserted or updated)
- Level: Beginner, level 1, draft
- Module: Piano Posture and Hand Position, module 1, draft
- Lessons: Bench and Body Alignment; Curved Fingers and Relaxed Wrists; Five-Finger Technique Check
- Practice: Guided Piano Setup Practice; optional, non-assessed, zero XP
- Core Challenge: Balanced Piano Setup Challenge; required `performance`, video submission, teacher-reviewed, 350 Core XP, passing score 70, resubmission allowed

All three lessons are draft `interactive` records with zero lesson XP. The challenge instructions allow existing teacher-approved alternatives: live demonstration, multiple angles, photographs plus narration, audio plus a teacher-observed setup, adapted keyboard, or one-hand evidence. Accommodations do not lower the maximum rubric score.

## XP contract

| Component | Value |
|---|---:|
| Intro | 50 |
| Instructional media | 100 |
| Core Challenge | 350 |
| Mastery | 125 |
| Module total | 625 |
| Unlock threshold | 438 |

No XP ledger row is created. Existing award, mastery, and unlock functions remain authoritative.

## Rubric

| Criterion | Weight |
|---|---:|
| Technique and safe hand shape | 35 |
| Posture and body alignment | 25 |
| Finger control and five-finger pattern accuracy | 20 |
| Student reflection/self-awareness | 10 |
| Preparation and submission completeness | 10 |
| **Total** | **100** |

Each criterion stores non-empty Exceeds, Meets, Developing, and Not Yet descriptions inside `activities.rubric.criteria[].bands`.

## ARIA limits

ARIA may advise on posture, bench distance, natural finger curve, relaxed wrists, finger independence, wrist tension, finger collapse, hand positioning, slow practice, and confidence. ARIA may not diagnose injury, assess or approve evidence, award XP, grant mastery, unlock content, or replace teacher review.

## Media and tools

No `module_instructional_media` row is created. All module media identity and activation fields remain null. `video_brief` records **NEEDS REVIEW** for staff. No Lab tool, `lab_tool_courses` binding, `lab_tool_id`, or JPAC tool activity is created.

## Risks and guards

- Draft modules count in the current non-archived Level 1 progress denominator. A new Module 1 insert aborts when a pending, active, paused, or completed Piano Level 1 enrollment exists.
- Existing Level 1, Module 1, lessons, and activities are reused only when their complete approved payload matches; partial academic matches abort without overwrite.
- Deterministic IDs identify rollback candidates only. An ID match never authorizes deletion by itself: rollback also requires the complete approved payload to match and every dependency/evidence guard to pass.
- No curriculum workflow, student-state, submission, review, XP, mastery, unlock, certificate, media, enrollment, or Career Path function is invoked.
- Full Piano rollout needs a later Piano-only metadata decision: the repository currently assumes 10 modules per level and 25,000 Core XP, while the approved Piano source contains 12 modules per level and 30,000 Core XP total.

## Validation plan

1. Retain preflight output as the manual baseline.
2. Require exactly one canonical Piano course.
3. Inventory Level 1 and Module 1 candidates and all dependencies.
4. Confirm the enrollment denominator gate.
5. After separately authorized execution, validate exact draft identities, three lessons, two activities, rubric total, XP values, and null media fields; compare the pre/post Piano Lab-binding count to prove no binding was added.
6. Compare Piano student-state and Singing baselines with the retained preflight output.
7. Review an exact rerun: it must reuse exact records and create no duplicates.

Because this artifact adds no manifest table, pre/post preservation comparison is manual. Both validation files emit identically named, stable, ordered full-row hashes for Piano enrollment/progress, Singing curriculum and student evidence, Career Path rows, and protected function definitions. The remaining summary counters are explicitly supplemental and do not replace full-content hash comparison. The migration itself never writes protected student-state tables.

## Rollback plan

Rollback resolves the actual Level 1 and Module 1 identities, then treats deterministic IDs only as candidate batch-created rows. Before deleting any candidate lesson, activity, Module, or Level, it requires the candidate's complete approved payload to match exactly and all dependency/evidence guards to pass. A reused parent is never deleted merely because it occupies the canonical position, and the Piano course is never deleted or updated. Rollback stops for enrollments, lesson or activity progress, current course-progress references, submissions/reviews, practice logs, XP/mastery evidence, instructional media or media progress, certificates, portfolio dependencies, curriculum revisions, change requests, lesson-linked activities, payload drift, or remaining children.

## Approval checklist

- [ ] Qualified piano teacher approves AI-proposed lesson and rubric content.
- [ ] Preflight shows exactly one canonical Piano course.
- [ ] Level and Module candidates are absent or exactly compatible.
- [ ] No affected Level 1 enrollment would receive a changed denominator.
- [ ] Media remains uncreated and inactive.
- [ ] Tool mapping remains documentation-only.
- [ ] Core Challenge is stored as `performance`.
- [ ] Rubric totals 100 and contains four bands per criterion.
- [ ] XP fields equal 50/100/350/125/625/438.
- [ ] Singing and shared functions match the retained baseline.
- [ ] Rollback guards have been independently reviewed.
- [ ] Separate database-execution approval is recorded.
