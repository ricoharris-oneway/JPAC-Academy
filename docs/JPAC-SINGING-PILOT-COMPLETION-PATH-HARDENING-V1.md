# JPAC Singing Pilot Completion Path Hardening v1

## Outcome

This change removes two frontend blockers in the Singing pilot completion path: module videos now support approved YouTube sources while continuing to report watch time through the existing progress function, and Teacher Studio can securely preview submitted evidence alongside the activity rubric. Module 2 curriculum readiness remains a controlled content blocker and was not changed.

## Provider-aware video playback

- YouTube watch URLs, `youtu.be` URLs, and existing `youtube-nocookie.com/embed` URLs are normalized through the existing instructional-media allowlist.
- YouTube playback renders through a responsive `youtube-nocookie.com` iframe. The official YouTube iframe API observes playback time and passes watched seconds and duration to the existing `jpac_record_module_video_progress` call.
- Progress is reported only from player events while the player is running. There is no manual-completion shortcut.
- Direct HTTPS `.mp4`, `.webm`, and `.m4v` sources continue to use the native HTML5 video element.
- The Lesson page uses the same provider-aware rendering, so the approved Video Finder URL `https://www.youtube.com/watch?v=WR2772TGrgo` remains playable through a privacy-enhanced embed.
- The existing 90% watch requirement, XP values, mastery calculation, module unlock behavior, and database functions were not changed.

If the YouTube player API cannot load, the privacy-enhanced iframe remains playable, but progress cannot be measured until the integration loads. The UI does not award completion without measured evidence.

## Module 2 readiness

The published Singing Module 2 remains a pilot blocker:

- It has a title and a required performance assignment/rubric.
- It does not have an approved instructional video.
- Its published lessons remain skeletal and lack the full student-facing content blocks, technique cues, common mistakes, and self-check structure used by Module 1.

No content migration was created. No course, level, module, lesson, or activity status was changed.

The existing safe staff paths are only partial:

1. Video Finder can attach a reviewed, approved YouTube URL without changing curriculum status.
2. Curriculum Studio can edit module fields, but intentionally locks published lessons and published activities.

Because no approved Module 2 video/content source was supplied and published content is locked, staff should approve a small, source-backed Module 2 content operation before launch. That operation should preserve all existing UUIDs and status, add a reviewed video, and fill only the missing overview, lesson instructions, practice/create expectations, self-checks, submission guidance, and rubric presentation. It must be separately reviewed before any SQL or database write.

## Teacher evidence and rubric review

- Teacher Studio reads the existing private storage path from a submission and requests a 10-minute signed URL from the existing `performance-submissions` bucket.
- Audio and video evidence is playable in the review card. Other file types receive the exact fallback: “Evidence cannot be previewed here. Download or open using the secure link.”
- Every available item also has an “Open secure evidence link” action.
- Raw private storage paths are not rendered to the page, and no public URL is generated.
- Rubrics are normalized for display from array, object, weighted, and string-only legacy shapes.
- Review buttons and existing review RPC behavior are unchanged. No auto-grading was introduced.

## Tests and boundaries

Focused tests cover:

- YouTube watch, short, and privacy-enhanced URL rendering;
- direct MP4 native playback;
- the Video Finder-approved URL’s safe display path;
- evidence preview, secure-link fallback, rubric normalization, and non-rendering of private paths.

This implementation adds no SQL, migrations, storage policies, RPCs, database writes, packages, lockfile changes, or configuration changes. It does not change enrollment, Wix/payment, Bronze/Silver/Gold, XP, progress rules, mastery thresholds, unlock thresholds, certificates, submission grading, Assignment Swap, Aria, or Live AI.

## Remaining pilot blocker and recommended next build

The Singing pilot should not treat Module 2 as content-ready until its video and lesson content are approved and installed through a separately controlled content change. The recommended next build is a minimal Module 2 content-readiness package based on an owner-approved source outline and approved video URL, with preflight/post-validation and an explicit approval gate before application.
