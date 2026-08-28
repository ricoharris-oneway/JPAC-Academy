# JPAC Aria Avatar Guide v1

## Aria identity

Aria is a warm, encouraging, polished, and student-friendly JPAC Guide. As of v1.1, her approved character image is displayed from `/images/aria/aria-guide.png`; the original lightweight inline SVG remains only as a load-error fallback.

## What the Avatar Guide does

Authenticated students see a small floating Aria button and the speech bubble, “Need help? I can guide you.” Clicking Aria opens the existing deterministic Guided Pop-Up Coach. The popup identifies Aria by name, includes her introduction, and displays a small speaking indicator.

Aria does not open the popup automatically. Her bounce and speaking-dot effects are CSS-only and are disabled when the browser requests reduced motion.

## Connection to Guided Pop-Up Coach v2

Aria is the visual identity for the existing v2 guide rather than a new guidance engine. Page-specific guidance remains selected from the current route, and students can still open the complete six-step pathway with Back, Next, Close, and Take me there controls.

## Where Aria appears

The shared authenticated layout continues to render the guide only when the current profile role is `student`. Aria is therefore available across the student dashboard, Career Pathing, My Academy and lessons, Creative Studio, Practice Submissions, Certificates & Portfolio, and JPAC Coach.

## Safety boundaries

- Deterministic frontend content only
- Click-to-open; no automatic popup
- React component-memory state only
- No AI, API, voice, speech synthesis, Supabase, database, upload, or browser storage behavior
- No XP awards, lesson completion, assignment submission, or academic-record changes
- The approved repository image is displayed directly; no media is generated, uploaded, or modified by the app

## Not included

v1 does not include Live AI, generated responses, voice playback, recording, persistent preferences, academic decisions, or teacher-facing behavior.

## Future v2 ideas — documentation only

- Add approved Aria image files for multiple poses
- Real JPAC-recorded voice clips
- First-login onboarding
- Page-specific Aria expressions
- Teacher-facing guide
- Progress-aware messages
- Live AI only after environment setup is stable
