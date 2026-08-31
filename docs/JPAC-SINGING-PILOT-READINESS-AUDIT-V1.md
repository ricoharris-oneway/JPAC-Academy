# JPAC Singing Pilot Readiness Audit v1

Audit date: 2026-08-31

Audited production main: `5b977e386e768b082e647c18fd334cba3f9a360a`

Scope: read-only production data, current application code, public production routing, and the one active external video. No student was enrolled and no protected student page was opened.

## A. Executive readiness summary

**Overall status: NOT READY for the first controlled live pilot student.**

The access boundary is appropriately Singing-only, draft curriculum is filtered from student reads, Aria onboarding exists, module 1 has two useful authored lessons, and the private submission storage path is in place. However, the current end-to-end learning loop cannot complete safely:

1. The module page sends a YouTube watch URL to an HTML5 `<video>` element. That source cannot play as a native video, so the 90% watch requirement cannot be recorded and module 1 cannot reach mastery.
2. Module 2 is published but has no video. Its two published lessons contain descriptions/objective arrays but no authored learning blocks, technique cues, common mistakes, or self-checks. Its required video step is therefore impossible.
3. Teacher Studio loads submission metadata but not the private media path or rubric. A teacher can see Approve/Request revision controls without being able to play the submitted evidence or score against visible criteria.

These are critical launch blockers because they prevent the intended Learn → Watch → Practice → Create → Teacher Review → Master pathway. The first real child pilot should not be used to discover them.

## B. What is ready now

- The production Singing course exists and is `published` (`b4eecea7-edd3-48ab-b2f8-e3d68e6e087e`).
- Level 1/Beginner is published; Levels 2–4 remain draft.
- Only published, entitled, and unlocked modules/lessons are readable to students through current RLS and application queries.
- Module order is deterministic. Level 1 modules 1–2 are published; modules 3–10 are draft.
- Four published lessons have unique, deterministic order values.
- Module 1 lessons contain concrete objectives, four authored instruction blocks each, technique cues, common mistakes, and self-checks.
- Module 1 has an active Video Finder media record and a working public YouTube video.
- Lesson-page video embeds use `youtube-nocookie.com` through URL normalization and a responsive 16:9 iframe.
- Aria's student welcome prompt and guided tour are present. The tour directs students to Career Pathing and then My Academy.
- Course, module, and lesson coach panels provide next-step guidance without changing academic records.
- Required performance activities, private storage, resubmission support, feedback history, and mastery functions exist.
- Mobile breakpoints stack the main grids, preserve responsive video, expose a mobile navigation drawer, and maintain 44px primary controls.
- The Singing Pilot Enrollment Manager is staff-only and grants only canonical Singing access after manual Wix verification.

## C. What is not ready

- Module-level YouTube playback and video progress tracking are incompatible.
- Module 2 has no approved video or active instructional media.
- Module 2's published lessons are content-light fallbacks rather than full guided lessons.
- Teacher Studio cannot open or play the student's private submission media.
- Neither the student submission card nor Teacher Studio presents the activity rubric.
- File selection accepts audio or video for every required activity even when the activity declares a specific submission type.
- Module 2's rubric stores bare criterion strings while module 1 uses weighted criterion objects.
- There is no documented age-appropriateness/content-review evidence attached to the active external video.
- Student-facing file format/size guidance is incomplete; the bucket permits supported media up to 500 MB, but the UI does not state formats, recommended size, duration, or upload-time expectations.
- Opening a lesson automatically creates an `in_progress` row at 1%, before the student deliberately marks anything complete.
- The invitation/nav call the destination “My Academy,” while the destination page heading says “My Courses.”

## D. Critical blockers

| ID | Blocker | Evidence | Impact before pilot | Required acceptance check |
|---|---|---|---|---|
| C1 | Module video player cannot play the approved YouTube URL | `ModulePage` renders `<video src={module.primary_video_url}>`; production stores `https://www.youtube.com/watch?v=WR2772TGrgo` | Module 1 cannot record 90% watched, award video Core XP, finalize mastery, or unlock module 2 | Approved YouTube source plays in the module Watch step and one controlled real pilot can reach ≥90% without duplicate XP |
| C2 | Published module 2 cannot satisfy its required Watch step | `primary_video_url`, `video_provider`, and `active_instructional_media_id` are null | Module 2 can never become complete even after module 1 is fixed | Add and approve a suitable video, then verify the module Watch step and privacy-enhanced lesson embed |
| C3 | Teacher cannot review the submitted performance evidence | Teacher Studio selects no `media_url`/`media_name`/`media_type` and renders no player or signed-media action | Teacher could approve or reject without seeing the work; the intended review loop is not operational | Teacher can securely play the private submission, see attempt/rubric, score it, return feedback, and the student can see that feedback |

## E. High-priority fixes

| ID | Finding | Why it should be fixed before pilot |
|---|---|---|
| H1 | Complete module 2's two published lessons | Each currently falls back to one description block and lacks a direct objective, authored steps, technique cues, common mistakes, and self-check |
| H2 | Show the required activity rubric to student and teacher | Students cannot prepare against the mastery standard and teachers cannot demonstrate consistent scoring |
| H3 | Normalize module 2 rubric schema | Bare strings do not match module 1's weighted `{name, weight}` criteria and complicate consistent rendering/review |
| H4 | Enforce and explain submission type | Module 1 says audio and module 2 says video, but the UI and RPC accept either audio or video for both |
| H5 | Add practical upload guidance | On phones, large video uploads can fail or consume substantial time/data; specify supported formats, recommended duration/size, and retry behavior |
| H6 | Record external-video review evidence | The video is active and was added by a developer, but the module has no approver timestamp and empty review notes; record age/content/safety review before children use it |

## F. Medium-priority improvements

- Make the 1% “started” write explicit to the learner, or move it behind a deliberate Start lesson action. It is expected current behavior but can surprise staff and students.
- Align “My Academy” and “My Courses” naming across invitation, navigation, headings, and support instructions.
- Add an estimated duration for every published practice activity; four of six published activities currently have no estimate.
- Give optional text-log activity a visible submission path or clarify that it is informational only. Module mission rendering currently focuses on bonus activities with a completion button and the single required media challenge.
- State teacher turnaround expectations and what “Awaiting review” means.
- Add a staff pre-pilot checklist covering enrollment, video availability, submission evidence, rubric review, feedback, revision, and mastery.
- Confirm the same module-level video appearing on both module 1 lesson pages is intentional and label its relevance for each lesson.

## G. Low-priority polish

- Add a Singing thumbnail instead of the generic graduation-cap artwork.
- Replace internal wording such as “Core XP threshold” with a short parent/student explanation.
- Add friendly recovery copy for interrupted mobile uploads.
- Add visible media duration beside the module 1 video (production duration is 13:58).
- Add a short “what happens next” note after submitting a creative challenge.

## H. Published Singing modules/lessons inventory

Production structure summary:

- Course: Singing — published, beginner, configured `module_count` 10.
- Level 1 Beginner: published; 2 published modules and 8 draft modules.
- Level 2 Intermediate: draft; 10 draft modules.
- Level 3 Advanced: draft; 10 draft modules.
- Level 4 Master: draft; 10 draft modules.
- Student-readable content at audit time: 2 published modules, 4 published lessons, and 6 published activities.
- Draft content remains filtered by status and unlock-aware RLS. No evidence was found that draft modules or draft lessons are returned to an entitled student.

| Order | Published module | Published lesson | Lesson readiness | Student-visible concern |
|---|---|---|---|---|
| 1.1 | Breath, Alignment & Vocal Health | Singer Alignment and Breath | 20 min; objective; 4 authored blocks; 3 cues; 3 mistakes; self-check | Same module video is shown here and in lesson 1.2 |
| 1.2 | Breath, Alignment & Vocal Health | Healthy Warm-Up Routine | 25 min; objective; 4 authored blocks; 3 cues; 3 mistakes; self-check | Video focuses on breath support more than the full warm-up sequence |
| 2.1 | Pitch, Tone & First Performance | Pitch Matching and Listening | 25 min; description and objective array only | No authored blocks, direct objective, cues, mistakes, self-check, or video |
| 2.2 | Pitch, Tone & First Performance | Foundation Performance | 35 min; description, objective array, and lesson rubric | No authored blocks, direct objective, cues, mistakes, self-check, or video |

Published-module hidden inventory:

- Module 1 contains one draft lesson (`Vocal Health for Real Creators`) and two draft practice activities. They are not returned by student queries.
- Module 2 contains three draft lessons (orders 101–103) and three draft activities. They are not returned by student queries.
- Publishing module 2 while its fuller lessons remain draft creates a visible quality mismatch: the student receives the older two sparse published lessons rather than the richer draft lesson set.

## I. Video readiness table

| Module | Current source | Availability | Lesson display | Module Watch step | Review/safety status |
|---|---|---|---|---|---|
| Breath, Alignment & Vocal Health | `https://www.youtube.com/watch?v=WR2772TGrgo` | Available; Healthy Vocal Technique; 13:58; active Video Finder record | Uses responsive `youtube-nocookie.com` iframe; expected to display | **Blocked:** native `<video>` cannot play a YouTube watch page, so progress events cannot reach 90% | Educational singing/breath-support topic and no obvious availability warning. Full age-appropriateness review evidence is not recorded; captions are unavailable on YouTube |
| Pitch, Tone & First Performance | None | Missing | No video section | **Blocked:** “Video preparation in progress”; completion requires 100% video | Must be sourced and reviewed before pilot |

YouTube/no-cookie assessment:

- The lesson page uses the privacy-enhanced YouTube embed domain.
- The module page does not use that embed component and instead treats the YouTube page as a direct media file.
- External YouTube availability, recommendations, and channel content can change. Staff should record the review date and keep a replacement plan.

## J. Assignment/review readiness table

| Module / activity | Published expectation | What works | Gap |
|---|---|---|---|
| Module 1 — Breath Control Studio Challenge | Required 30–60 second audio; 5 weighted criteria; pass 70; resubmission allowed | Private bucket, attempt numbering, student history, feedback status, and Core XP award path exist | Student does not see rubric; UI accepts video too; teacher cannot play evidence or see rubric |
| Module 1 — Five-Day Healthy Warm-Up Log | Optional text, 15 min | Instructions exist | Mission UI has no dedicated text-response form and may reduce this to a generic complete-practice action |
| Module 1 — JPAC Tool Practice | Optional comparison, no submission | Bonus completion path exists | No concrete JPAC tool route is stored, so “JPAC Lab” may not actually launch a tool |
| Module 2 — Level 1 Foundation Performance | Required video, 30 min, 4 criteria, pass 70, resubmission allowed | Private media/attempt/review functions exist | Criteria schema is unweighted strings; UI accepts audio; teacher cannot inspect evidence/rubric |
| Module 2 — two optional practices | Three-take comparison activities | Bonus completion path exists | No evidence upload/reflection is required, so completion is self-attested |

Teacher feedback is visible to the student in submission history and the Aria feedback panel after assessment. The database review function correctly decides approval versus revision from the passing score and avoids duplicate Core XP. The operational UI, however, lacks the evidence and rubric required to make that decision responsibly.

## K. Student experience risks

- A student can begin module 1 but cannot complete its video gate with the current player.
- The flow visually presents all six mission stages as available even when an essential technical prerequisite is impossible.
- Module 2 will remain locked until module 1 mastery, then immediately expose incomplete learning content and another impossible video gate.
- The lesson page writes 1% progress merely by opening a lesson. This is consistent with “started,” but it should be explained and included in pilot expectations.
- Progress wording switches to generic “published learning progress” because two modules are published; it no longer says “pilot module,” even though the launch is described as a Singing pilot.
- The required rubric is not visible before upload.
- The upload selector does not tell the student which exact format is required or recommend a file size.
- “My Academy” versus “My Courses” may confuse young learners following emailed instructions.
- Aria onboarding is present and non-mutating, but it starts with a broad 14-career-path explorer before the concrete Singing course. Staff should decide whether that is helpful or distracting for the first children.

## L. Staff workflow risks

- Enrollment itself is clear: verify Wix payment/scholarship, confirm the existing student email, use `/staff/singing-pilot-enrollment`, and grant Singing only.
- Video maintenance is available at `/staff/video-finder`, but adding a valid YouTube URL does not make the module page's native player compatible.
- Teacher review is at `/teacher`, but the current review card cannot display or open the private media evidence.
- Teacher Studio permits a numeric score and approval without presenting rubric criteria.
- The generic legacy Enrollment Manager remains visible to admins and has broader side effects; pilot operations should use the narrow Singing manager only.
- Staff need a documented response for missing profile, large mobile upload, revision request, video removal, and stalled mastery.
- There is no production-safe authenticated audit identity. Because opening a lesson writes progress, readiness checks can pollute a real student's record unless a dedicated non-academic preview is built.

## M. Recommended fixes in priority order

1. Build a single provider-aware instructional video component used by module and lesson pages. For YouTube, use the privacy-enhanced iframe/player API and record honest watch progress without duplicate XP.
2. Add and approve module 2 instructional media, with reviewer/date/safety notes.
3. Complete the authored content fields for module 2's two published lessons, or return module 2 to draft until content and video are ready.
4. Add secure teacher evidence playback using short-lived signed URLs; load media name/type and show attempt metadata.
5. Render the same normalized rubric to students and teachers, including weights and passing score; normalize module 2's rubric data.
6. Enforce the configured submission type and show supported formats, duration, recommended size, upload status, and retry guidance.
7. Add targeted automated tests for YouTube module playback/progress, locked-module filtering, private evidence review, rubric rendering, duplicate-XP prevention, and mobile upload errors.
8. Run a staff-only preview that cannot create lesson progress, followed by the approved first controlled real-student enrollment test.

Minimum go/no-go acceptance before enrollment:

- Both published modules have approved, playable videos.
- A student can complete module 1's video step and unlock module 2 exactly once.
- All four published lessons contain complete student-ready instruction.
- Student sees the required rubric and correct file requirement before submission.
- Teacher securely watches the submitted evidence, scores the visible rubric, and sends feedback.
- Student sees approval/revision feedback; revision and mastery behave without duplicate XP.
- Draft modules, lessons, and activities remain hidden and excluded from progress.
- Mobile upload is tested with a representative phone video on the actual production network path.

## N. Recommended next build after audit

**JPAC Singing Pilot Completion Path Hardening v1** should be the next build. Keep it narrowly scoped to:

- provider-aware YouTube playback and watch progress;
- module 2 video/content readiness or safe withdrawal to draft;
- secure teacher submission-media playback;
- shared rubric rendering and schema normalization;
- submission-type/file guidance and mobile upload resilience;
- a read-only staff preview mode that never writes lesson progress.

Do not expand this build into Wix automation, Bronze/Silver/Gold, multi-course access, new enrollment behavior, or unrelated advisor remediation.

## O. Change-control confirmation

This audit created this Markdown document only. It performed read-only production queries and read-only browser/code inspection. It did not:

- run SQL writes or modify any database record;
- create or apply a migration;
- change Supabase files, configuration, packages, or lockfiles;
- enroll or create a student;
- open a protected lesson as a student;
- change course/module/lesson/activity status or content;
- change enrollment, XP, progress, mastery, submission, review, certificate, Aria, Video Finder, Enrollment Manager, Wix, or payment logic.

### Audit limitations

- The production browser had no authenticated student session and redirected `/courses` to `/login`.
- No fake student or test enrollment was created.
- An existing student was not used because opening a lesson automatically creates an `in_progress` row.
- Protected UI findings are therefore based on production data, RLS/function definitions, application rendering paths, responsive CSS, and the public availability of the active video. Final interaction validation remains intentionally deferred until the critical fixes pass and the first controlled real pilot is approved.
