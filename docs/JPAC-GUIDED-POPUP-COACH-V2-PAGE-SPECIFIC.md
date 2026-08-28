# JPAC Guided Pop-Up Coach v2: Page-Specific Guidance

## What changed from v1

v2 opens with deterministic guidance chosen from the student's current route. The original six-step JPAC pathway remains available through **View full pathway**, with its Back, Next, Close, and Take me there controls unchanged in purpose.

The guide remains student-only and click-to-open. It makes no request when a page loads or when the popup opens.

## Page guidance map

| Current page | Guidance | Primary route | Secondary route |
| --- | --- | --- | --- |
| Dashboard or unmatched student page | Start your JPAC journey | `/career-pathing` | `/courses` |
| Career Pathing | Choose your creative path | `/career-pathing` | `/courses` |
| My Academy, course | Continue your course | `/courses` | `/studio` |
| Module, lesson, or mission | Complete the lesson flow | `/courses` | `/studio` |
| Creative Studio or Creator Tool | Practice with Creator Tools | `/studio` | `/practice-coach` |
| Practice Submissions | Submit work for teacher review | `/practice-coach` | `/certificates` |
| Certificates & Portfolio | Build your portfolio | `/certificates` | `/career-pathing` |
| JPAC Coach | Use your coach guidance | `/courses` | `/career-pathing` |

Specific active course, lesson, and tool destinations require authorized dynamic state. The guide deliberately uses My Academy and Creative Studio as safe existing fallbacks instead of guessing identifiers.

## Full pathway

The complete sequence remains Career Pathing → My Academy → Lessons → Creative Studio → Practice Submissions → Certificates & Portfolio. Full-pathway steps display the current step count and support Back and Next navigation.

## Safety boundaries

- Student-only visibility is preserved in the shared authenticated layout.
- The popup opens only after the student clicks **Guide Me**.
- State exists only in React component memory.
- No AI, API, Supabase, database, upload, `localStorage`, or IndexedDB behavior is used.
- The guide does not award XP, complete lessons, submit assignments, or change academic records.
- Every action uses an existing internal route.

## Not included

v2 does not add automatic onboarding, persistence, progress-aware decisions, teacher customization, Live AI, or any academic action.

## Future v3 ideas — documentation only

- First-login onboarding
- Progress-aware next best step
- Role-specific teacher guide
- Student-selected career path memory
- Teacher-customized guide messages
- Optional dismissed-state persistence
- Later Live AI integration after environment issues are solved
