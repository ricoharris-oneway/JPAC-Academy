# JPAC AI Instructor Phase 2F: UI Wiring Behind Off Flag

## Scope

Phase 2F adds an optional **Live AI Lesson Help** entry point to an authorized lesson. It supports only `lesson_explanation`, requires a student click, and does not replace the Phase 1 deterministic JPAC Coach.

## Default and enablement behavior

- The panel is hidden unless `VITE_JPAC_LIVE_AI_ENABLED` is exactly `true`.
- Client visibility does not enable server execution. Provider execution also requires the server-only `JPAC_AI_SERVER_ENABLED=true` configuration and valid server-side provider configuration.
- When the server flag, provider, or key is unavailable, the endpoint returns the safe Phase 1 advisory fallback.
- Turning off `VITE_JPAC_LIVE_AI_ENABLED` removes the optional panel without changing lesson access or the deterministic Coach.

## Request and privacy boundary

The panel sends only `{ "mode": "lesson_explanation" }` after the authenticated student clicks. It does not send student identifiers, client-supplied roles, private notes, course history, submissions, teacher-review data, unpublished curriculum, or media.

There is no conversation persistence, chat history, streaming, tool calling, upload, or automatic request on page load.

## Academic safety

The panel always displays:

- Advisory guidance only
- Teacher review required
- This does not award XP or update progress

It cannot submit assignments, invoke review actions, award XP or mastery, update progress or enrollment, issue certificates, publish curriculum, or modify media. Existing lesson completion and Phase 1 Coach behavior remain independent of live AI availability.

## Rollback

Set `VITE_JPAC_LIVE_AI_ENABLED` to false or remove it. No database or schema rollback is needed.

## Preview and production smoke test

1. With `VITE_JPAC_LIVE_AI_ENABLED` unset or set to anything except the exact string `true`, open an authorized lesson and confirm the deterministic JPAC Coach remains visible while Live AI Lesson Help is absent. Confirm the Network panel shows no `/api/ai-instructor` request on load.
2. In an approved preview environment only, set `VITE_JPAC_LIVE_AI_ENABLED=true`, open an authorized lesson, and confirm the optional panel and all three safety labels appear.
3. Confirm no request occurs until **Ask for lesson explanation** is clicked. Click once and verify the request body is exactly `{ "mode": "lesson_explanation" }` and contains no student, role, history, review, curriculum, or media data.
4. Verify a successful response is labeled advisory and that a disabled/unavailable provider falls back safely without changing lesson progress, XP, mastery, enrollment, submissions, certificates, or curriculum.
5. Repeat steps 1–4 in production only after the server flag and provider configuration have received separate operational approval. Roll back immediately by removing or disabling the client flag.
