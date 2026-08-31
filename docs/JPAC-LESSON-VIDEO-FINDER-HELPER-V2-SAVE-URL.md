# JPAC Lesson Video Finder Helper v2: Save Approved URL

Staff access the helper at `/staff/video-finder`. Teachers, admins, and developers can enter a reviewed YouTube URL, title, and duration, preview it, and save it to the row's module. Students remain blocked from the helper by the existing staff route guard.

## Storage and student display

The staff-only `video_finder_save_approved_youtube` RPC writes versioned video records in `public.module_instructional_media` and updates only the video projection fields on `public.course_modules`: `active_instructional_media_id`, `primary_video_url`, `video_provider`, `video_title`, `video_duration_seconds`, and `updated_at`. It does not change module or lesson status. Because lessons belong to modules and `public.lessons` has no video URL field, one approved module video is displayed on each published student lesson page in that module through the existing `primary_video_url` read path. Lesson completion and viewing progress are not changed by this display.

## Validation and review

Accepted inputs are HTTPS YouTube watch URLs, `youtu.be` short links, and YouTube/YouTube No-Cookie embed URLs containing an 11-character video ID. Empty, malformed, HTTP, credential-bearing, port-bearing, non-YouTube, and raw HTML inputs are rejected. No request is made to YouTube to obtain metadata; staff enter the reviewed title and duration.

Before saving, confirm age appropriateness, clean language, accurate instruction, lesson fit, safe linking/embedding, and acceptable comments, ads, and branding risk.

## Safety boundaries and rollout

There is no YouTube API, scraping, automatic approval, or automatic curriculum publishing. The RPC requires an authenticated JPAC staff role, validates again in Postgres, preserves prior active media as retired history, and is executable only by `authenticated`. It does not reference XP, progress, mastery, certificates, enrollments, submissions, reviews, Assignment Swap, or curriculum status fields.

Run the matching preflight SQL before the migration and compare its protected counts and curriculum-status hash with the post-validation output. Apply the migration only after PR approval. To roll back the API surface, run `supabase/rollbacks/202608300001_video_finder_save_approved_youtube_rollback.sql`; existing saved video data remains intact and readable after rollback.
