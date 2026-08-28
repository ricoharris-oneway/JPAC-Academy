# JPAC AI Instructor Phase 2G Direct Diagnostic

## Preview test route

Authenticated staff, admin, and developer users can open this internal route directly on a Preview deployment:

```text
<preview-url>/ai-instructor-preview-debug
```

The route is intentionally absent from normal student navigation.

## Interpreting the client flag

- `Client flag detected: yes` means the deployed browser bundle was built with `VITE_JPAC_LIVE_AI_ENABLED=true`; the Live AI Lesson Help panel should render on supported lesson pages.
- `Client flag detected: no` means that exact value was not embedded in the deployed client bundle. Confirm the Preview-scoped variable and redeploy Preview.

## Interpreting the manual fallback test

The button sends only `{ "mode": "lesson_explanation" }` through the existing authenticated Live Coach client pathway. It never runs automatically.

- `live response` means the guarded provider returned a valid advisory response.
- `fallback` means the deterministic JPAC Coach boundary remained active.
- A safe fallback reason may be `ai_disabled`, `provider_config_missing`, `provider_timeout`, `provider_failure`, or `invalid_provider_output`.
- Client and HTTP failures are shown only as short non-secret labels.

The page does not display tokens, secrets, prompts, full provider responses, student identifiers, lesson content, or protected academic data.

## Boundary

This route is for internal Preview validation only. Production Live AI should remain disabled until separately approved. The route does not enable Live AI, add modes, persist data, upload media, or perform academic actions.
