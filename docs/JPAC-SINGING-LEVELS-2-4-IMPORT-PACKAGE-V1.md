# JPAC Singing Levels 2-4 Curriculum Import Package v1

## Decision and scope

This package prepares, but does not apply or publish, the finalized Singing curriculum for Level 2 modules 11-20, Level 3 modules 21-30, and Level 4 modules 31-40. It reuses all 30 canonical module IDs, updates only non-video curriculum fields, creates the 90 currently missing lesson records and 30 currently missing required assignments, and keeps every affected record in `draft`.

It does not touch Singing Beginner, non-Singing courses, videos, `module_instructional_media`, enrollment/access, progress, XP ledgers, mastery, submissions, reviews, certificates, Wix/payment, Aria, or Live AI. The SQL files are prepared artifacts and were not applied.

## Production baseline captured before preparation

Read-only inspection on 2026-09-04 found:

- 40 canonical Singing modules; 30 targets in Levels 2-4.
- All 30 target module IDs already exist and remain draft.
- Every target has canonical `core_xp = 625` and `core_unlock_threshold = 438`.
- Target children before import: 0 lessons and 0 activities.
- Singing modules carrying a video projection or instructional-media record: 29.
- Established projection-field video hash: `59cc00f5ebf4997aaa2d2b79884be900`.
- Strong package hash including per-module media-record count: `e6e45328064ad2b26c8d7df6de4383ec`.
- Protected row counts: enrollments 2; lesson progress 7; activity progress 0; XP ledger 6; student XP ledger 0; student skill mastery 0; submissions 1; certificates 0.

The stronger hash is the migration gate because it covers every requested video field plus the `module_instructional_media` record count. The established hash is retained for continuity with prior JPAC validations.

### Existing Singing video baseline

`—` means null. Media count is the number of `module_instructional_media` records for that module.

| Level / module | Module ID | Existing module title | URL | Video title | Provider | Seconds | Active media ID | Media count |
|---|---|---|---|---|---|---:|---|---:|
| 1 / 1 | `b4ba6507-adc3-4a14-ab72-4db258917106` | Breath, Alignment & Vocal Health | `https://www.youtube.com/watch?v=TtKzDokaps8` | 5 MIN EASY VOCAL WARM UP for singers (all levels) | youtube | 511 | `d5a751d9-3a04-4af8-a0f6-1c195f9ed719` | 2 |
| 1 / 2 | `d2d4edbb-4d8a-438f-a5ef-017ca4053d68` | Pitch, Tone & First Performance | `https://www.youtube.com/watch?v=sW0kDEtH53I` | Fix your PITCH in 10 minutes - Vocal Lesson | youtube | 593 | `10520895-7aa0-4584-b23f-d51f9ffe14a5` | 1 |
| 1 / 3 | `6e39adb2-cb8a-47c3-9041-24a3e28bec58` | Pitch Control | `https://www.youtube.com/watch?v=qrSWGQ2p_xA` | Pitch! How To hit the right note! | youtube | 280 | `8a83e477-3777-4e1c-adbe-2994a6e27ffd` | 1 |
| 1 / 4 | `7de98d44-f51b-4276-a689-7ebea13a4b5c` | Rhythm, Timing & Groove | `https://www.youtube.com/watch?v=XloRLMSrRw0` | BEGINNER'S GUIDE TO VOCAL TIMING! | youtube | 390 | `6d420c21-aaef-40d6-aaed-d236c005470c` | 1 |
| 1 / 5 | `5be434ea-f5cd-48a2-859c-fb37647f7a2e` | Tone & Resonance | `https://www.youtube.com/watch?v=aN7U9XlZxBw` | How to Sing with Proper Placement | youtube | 933 | `76550d16-a8b5-4758-96b2-bc9204f7e0fc` | 1 |
| 1 / 6 | `da1cb417-f384-42e8-8cee-27798a315ce6` | Diction & Storytelling | `https://www.youtube.com/watch?v=96KWLPo1Fpg` | Better Diction in Singing | youtube | 697 | `ad1275b3-31ba-4fc9-bef7-2bf1a2f8164e` | 1 |
| 1 / 7 | `e0ac630e-2519-4dea-aa24-68a3dc6a0f5e` | Dynamics & Expression | `https://www.youtube.com/watch?v=AljwFZMojV4` | Dynamics in Singing | youtube | 605 | `b9f98d96-0201-43dd-b5c7-4335138af451` | 1 |
| 1 / 8 | `4e2c21fc-a471-498e-b73c-1fbdb63317c5` | Microphone & Recording Basics | `https://www.youtube.com/watch?v=HvXLhhpFEPI` | How to Record Vocals in Cakewalk for Beginners | youtube | 1006 | `a0c7b679-31df-46a4-98e5-4d1a554ab9b3` | 1 |
| 1 / 9 | `1f83879e-e532-41df-89e1-829940f77faf` | Performance Confidence | `https://www.youtube.com/watch?v=PvffdsR3X9E` | Singing with Confidence | youtube | 310 | `73a4eb64-ad03-4038-95ab-0939b14b4aeb` | 1 |
| 1 / 10 | `0d8a7711-536e-4b47-b39a-c69ebc2a07b5` | Beginner Showcase | `https://www.youtube.com/watch?v=gGBMy8FcxTs` | The Complete Beginners Guide To Singing | youtube | 1339 | `ff51de84-96a4-417b-999e-959345416508` | 1 |
| 2 / 1 | `9ddec183-1b07-49b4-a181-84355a8c5ec7` | Breath Control Under Pressure | `https://www.youtube.com/watch?v=e-9LPpsBidE` | How to Breathe when Singing: Inhalation | youtube | 281 | `a21f61a4-7979-46b0-b1de-0874731c5bcf` | 1 |
| 2 / 2 | `d554c1ad-0a11-46b2-9060-97079c2b4132` | Extending Range and Registration | `https://www.youtube.com/watch?v=Kl8RO01OSH8` | Daily Vocal Routine #3 | youtube | 1202 | `23f4245c-536f-4019-8109-cd76ebcdf4c5` | 1 |
| 2 / 3 | `9fdc2b0c-d971-408e-9e18-5fbe11a8f663` | Tone Colors and Style | `https://www.youtube.com/watch?v=f2T3ey_w5gs` | How to change the color of your singing voice | youtube | 257 | `842c510a-3e84-4d8d-877b-05c531268882` | 1 |
| 2 / 4 | `906bb610-516a-473b-9cef-00a1257b9f14` | Harmony and Ensemble Precision | `https://www.youtube.com/watch?v=-xBjXfquTUA` | How to Sing Harmonies for Beginners | youtube | 533 | `1d2b4568-b324-4c45-ba75-47b8216c3b8a` | 1 |
| 2 / 5 | `5d76e8b5-8eeb-44b0-b65d-495d878adf64` | Runs, Riffs and Musical Choices | `https://www.youtube.com/watch?v=CK2VEoC9mPA` | How to Sing Riffs and Runs | youtube | 1305 | `1e23474c-7c2e-47ac-93ac-8a37fc2798a4` | 1 |
| 2 / 6 | `e7954136-fa48-4520-ae9d-ff99f931e5db` | Interpretation and Phrasing | `https://www.youtube.com/watch?v=UWwopW5YuX0` | Learn to PHRASE for Singing | youtube | 355 | `a95ca5a5-9aeb-4297-a675-7583e8ab8b38` | 1 |
| 2 / 7 | `cda67569-1e56-4710-9af6-d7845017132b` | Studio Vocal Workflow | `https://www.youtube.com/watch?v=PlXiD6NzldU` | How a GRAMMY winning producer/engineer records vocals | youtube | 301 | `16a6d11b-6979-4fb5-afac-4a4324280114` | 1 |
| 2 / 8 | `d70face4-fc67-44ab-bf72-e1d1df1a433c` | Live Performance Stamina | `https://www.youtube.com/watch?v=axXBjJil10k` | Improve Vocal Stamina | youtube | 315 | `4a03a22b-da77-4006-bb8b-13b5e68cba55` | 1 |
| 2 / 9 | `2827ad5d-f9e1-4c89-b076-00b736d4b324` | Collaboration Session | `https://www.youtube.com/watch?v=ShrvbhGDu2o` | Blend and balance in Team Singing | youtube | 500 | `7e9f5588-f4d0-4361-8586-20b02c14efbb` | 1 |
| 2 / 10 | `c7460619-7d7b-477d-86c1-9d2759294dc4` | Intermediate Performance Project | `https://www.youtube.com/watch?v=XvsD93qFA3M` | Singing Performance Tips | youtube | 647 | `db530e41-a9ed-4b7c-9ee5-1f2b7395f8f7` | 1 |
| 3 / 1 | `4e536f7e-2fb6-46c4-ad79-d3ac847e2e98` | Advanced Vocal Coordination | `https://www.youtube.com/watch?v=uWrv4JtGehQ` | The Coordinated Singing Voice | youtube | 691 | `b2cfa96f-590a-4e21-a5c3-e992ae1307dc` | 1 |
| 3 / 2 | `919e4301-0b79-4863-9993-7a70593d6e06` | Genre Fluency | `https://www.youtube.com/watch?v=3Jx6tPUwPtI` | Find Your Vocal Genre! | youtube | 1273 | `1aa9f8ee-3d15-41bb-9794-7b9211a87dd6` | 1 |
| 3 / 3 | `a19115da-d85f-433f-8595-26d687bb3be5` | Advanced Harmony and Arrangement | `https://www.youtube.com/watch?v=ZJDpgWhupzE` | Advanced R&B Vocal Arrangement | youtube | 1229 | `b8855c56-6f10-426b-8659-68056363b351` | 1 |
| 3 / 4 | `75b749fa-6d53-46ec-93e0-e00f1faa1498` | Improvisation With Intent | `https://www.youtube.com/watch?v=LKWy4qOdfV8` | Super easy improv trick for singers | youtube | 738 | `da9d1973-4923-4139-aad4-610d385fe605` | 1 |
| 3 / 5 | `08fa97b2-592a-4dcd-afa7-1dc9981f089e` | Character, Emotion and Authenticity | `https://www.youtube.com/watch?v=UdbaRF7iRaQ` | Sing with Emotion | youtube | 769 | `756372a6-4f2c-46be-aa43-018ff6480447` | 1 |
| 3 / 6 | `ef3faeb6-b1ea-4553-a521-ca8619bcb06a` | Recording Session Leadership | `https://www.youtube.com/watch?v=LTy5l_ptbDk` | Better Sounding Vocals in Cakewalk | youtube | 1339 | `469a78e8-5770-4487-933d-fef56ddc3d12` | 1 |
| 3 / 7 | `2513b430-baa2-4336-94cb-ec930853fd31` | Performance Production | `https://www.youtube.com/watch?v=zwy7eVHt2fs` | 3 Tips To Improve Your Stage Presence | youtube | 232 | `ddb966ab-b99b-4baa-8ba3-f80c8bbb5ccf` | 1 |
| 3 / 8 | `5d02e58a-35f8-42e9-ac79-e4d427abf325` | Audition Strategy | `https://www.youtube.com/watch?v=T88c2z1MlrY` | How to Prepare for a Singing Audition | youtube | 911 | `b5e52e82-271c-4de8-9939-6c28f3c7f5fb` | 1 |
| 3 / 9 | `bba3f08a-8f59-42f0-bcf5-22b0fa082760` | Original Vocal Project | `https://www.youtube.com/watch?v=BotIYYkWOxY` | Improve Your Vocal Tone Instantly | youtube | 892 | `1edf59e6-4d4a-4e17-a5c8-2d9e5a63469f` | 1 |

Level 3 module 10 and all Level 4 modules currently have no video projection and no instructional-media rows; the import intentionally leaves those values unchanged.

## Prepared curriculum inventory

| Global modules | Level | Level title | Records prepared |
|---|---:|---|---:|
| 11-20 | 2 | Intermediate Vocal Development | 10 modules, 30 lessons, 10 assignments |
| 21-30 | 3 | Advanced Vocal Performance | 10 modules, 30 lessons, 10 assignments |
| 31-40 | 4 | Master / Performance Artist | 10 modules, 30 lessons, 10 assignments |

Each module payload contains the finalized module title, overview, learning objective, career connection, three lesson titles and summaries, assignment/final assignment, submission expectation, five equally weighted mastery criteria, and teacher review criteria. The migration is the canonical structured payload; this document records its controls and inventory.

## Level completion standards

Level 2 completion requires safe independent warm-up, growing pitch accuracy, longer-phrase breath management, chest/head register awareness, clear tone and diction, rhythmic control, emotion and style, a prepared longer section, and the Level 2 showcase.

Level 3 completion requires advanced intentional warm-up, chest/head/mix control, genre-aware style, emotional storytelling, sustained notes and phrases, backing-track performance, stage presence, self-recording/review, intentional interpretation, and the Level 3 showcase.

Level 4 completion requires a personalized warm-up, consistent advanced control, purposeful runs/riffs, audition readiness, studio preparation, background-vocal/harmony awareness, defined artist identity, a professional performance plan, a full final rehearsal, and a final showcase/portfolio piece.

## Import behavior and safety gates

The migration:

1. Refuses to run unless exactly 30 canonical Singing Level 2-4 modules exist and remain draft with canonical XP.
2. Refuses to run if the strong video/media-count hash differs from the captured baseline.
3. Updates existing module rows by `(course, level_number, level_module_number)` and never assigns module IDs.
4. Does not mention any protected video column in an `UPDATE` or `INSERT`, and never mutates `module_instructional_media`.
5. Inserts a lesson only when neither its sort order nor normalized title already exists in that module.
6. Inserts an assignment only when no required activity or normalized assignment title already exists in that module.
7. Keeps modules, lessons, and assignments in draft. It does not set approval fields.
8. Rechecks child counts, draft status, video/media content, XP contract, and protected academic/access counts before commit.

The preflight is explicitly `READ ONLY` and refuses a stale baseline or newly added target children. The post-validation is also `READ ONLY`. The rollback restores the exact previous shell titles/content and deletes only the 90/30 child baseline after asserting those exact counts; because the production baseline had zero target children, this is unambiguous.

## Approval boundary

No SQL was applied while preparing this package. The next approval is to review and explicitly authorize application of `202609040001_singing_levels_2_4_curriculum_import.sql`. Publishing must remain a later, separate gate after post-validation and curriculum review.
