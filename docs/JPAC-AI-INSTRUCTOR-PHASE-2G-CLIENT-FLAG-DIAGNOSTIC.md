# JPAC AI Instructor Phase 2G Client Flag Diagnostic

## Purpose

This frontend-only diagnostic confirms whether a deployed client bundle was built with `VITE_JPAC_LIVE_AI_ENABLED=true`. It does not inspect server environment variables and does not enable Live AI.

## Test URL

Use this pattern on a lesson route in a Preview deployment:

```text
<preview-url>/lesson-path?jpacLiveAiDebug=1
```

The marker appears immediately after the lesson header. It reports whether the client flag was detected, the expected flag key and value, whether the panel should render, and the safe Vite build mode.

If the client flag is absent or not exactly `true`, it displays:

> The client bundle does not see VITE_JPAC_LIVE_AI_ENABLED=true. Redeploy Preview after setting the variable.

## Safety boundaries

- The query parameter only reveals the diagnostic; it never enables the Live AI panel.
- The panel remains gated by `VITE_JPAC_LIVE_AI_ENABLED === "true"`.
- Rendering the diagnostic makes no API request. Live AI remains manual-click-only.
- The request payload remains `{ "mode": "lesson_explanation" }`.
- The diagnostic exposes no secrets, API keys, server environment values, tokens, student identifiers, or lesson content.
- It does not persist or log prompts, responses, or identity data.
