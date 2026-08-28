# JPAC Aria v3: First-Login Prompt With Dismiss State

## What the prompt does

Students who have not dismissed the prompt in the current browser see a small, non-blocking Aria welcome card: “Welcome to JPAC Academy. Want me to show you around?” They can start the existing seven-step JPAC Tour or choose **Maybe later**. Aria’s floating button remains available regardless of the prompt state, so the tour can always be started manually later.

The prompt is deterministic frontend UI. It performs no AI, API, voice, academic, or database action.

## Local dismissal state

- Key: `jpac:aria:onboardingPromptDismissed:v1`
- Only stored value: `"true"`
- Purpose: non-academic prompt dismissal/completion on this browser

The helper wraps browser-storage access in `try/catch`. If localStorage is blocked or unavailable, Aria continues safely and dismissal behaves as session-only.

## What is not stored

The prompt never stores a student name, email, user ID, course or lesson ID, progress, submission, grade, XP, mastery, certificate, enrollment, review, curriculum, or any other academic or identifying data.

## Prompt and tour behavior

- **Start JPAC Tour** hides the welcome card for the current session and opens step 1 of the existing onboarding tour.
- **Maybe later** hides the card and writes the single dismissal value.
- Closing/leaving the tour or choosing its destination remembers dismissal locally.
- Opening Aria manually still shows page-specific guidance and offers the tour.
- The existing full six-step pathway remains available.

## Safety boundaries

- Student-only presentation through the existing shared layout
- Approved Aria image
- Non-blocking, mobile-responsive UI
- No SQL, Supabase, database, API, AI, voice, upload, IndexedDB, or academic writes
- The tour safety copy remains visible

Any future database-backed onboarding completion requires separate approval and is not part of v3.
