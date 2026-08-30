# JPAC Lesson Video Finder Helper v1

## Purpose and access

Video Finder Helper gives JPAC teachers, admins, and developers a read-only list of curriculum lessons/modules and ready-to-click YouTube searches. Staff can access it from the staff navigation at `/staff/video-finder`. The route and navigation entry use the existing staff role set; students are redirected and never receive the navigation entry.

The deterministic search formula is: `course name + lesson title (or module title when no lesson exists) + youth beginner tutorial`.

## Safety boundary

The helper reads existing course, module, lesson, level-number, and module video URL fields. It does not save selected videos, update lessons, publish curriculum, scrape YouTube, or call the YouTube API. It contains no database writes, RPC calls, SQL, migrations, or automatic video workflow.

## Required review checklist

Before approving any video outside this helper, staff must confirm it is age appropriate, uses clean language, matches the lesson skill level, teaches accurately, contains no confusing or inappropriate content, can be embedded or linked safely, and has acceptable comments/ads/branding risk.

## CSV template

“Copy CSV Template” generates CSV client-side for the visible course filter. Columns are:

`course_name`, `course_id`, `level_number`, `module_number`, `module_id`, `module_title`, `lesson_title`, `existing_video_url`, `suggested_youtube_search_term`, `youtube_search_url`, `selected_youtube_url`, `selected_video_title`, `approved`, `notes`.

The selection and approval columns are intentionally blank. Copying the CSV does not import or save anything.

## Future v2 ideas (documentation only)

- Approved-video CSV importer with validation
- Bulk-update preview screen
- YouTube Data API search integration
- Per-course video review queue
- Embed availability checker
- Staff approval workflow
- Age-appropriateness rating field
- Audit log for approved videos

Any importer or publishing workflow requires a separate review and explicit authorization before implementation.
