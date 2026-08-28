# JPAC Guided Pop-Up Coach v1

## What it does

The Guided Pop-Up Coach gives authenticated students an optional, click-to-open six-step walkthrough. Students can move forward and back, close the guide, or choose **Take me there** to open the relevant existing JPAC Academy page.

It is deterministic rather than AI-driven: every title, message, action, and route is reviewed frontend data. The guide makes no AI or API request and does not infer academic status.

## Where it appears

The student-only **Guide Me** trigger lives in the shared authenticated app layout. It is therefore available on the student dashboard, Career Pathing, My Academy, course and lesson pages, Creative Studio, and JPAC Coach. It is not added to normal staff workspaces.

## Route targets

| Step | Destination | Existing route |
| --- | --- | --- |
| Choose your creative career path | Career Pathing | `/career-pathing` |
| Continue your course | My Academy | `/courses` |
| Complete the lesson steps | My Academy safe fallback | `/courses` |
| Practice with Creator Tools | Creative Studio | `/studio` |
| Submit or review your work | Practice Submissions | `/practice-coach` |
| Build your portfolio | Certificates & Portfolio | `/certificates` |

The lesson step uses My Academy because a specific next lesson depends on authorized course state. v1 does not inspect or alter that state.

## Safety boundaries

- The guide opens only after a student clicks **Guide Me**.
- State remains in React component memory and resets on navigation or reload.
- It uses no AI, API, Supabase, database, browser storage, or upload behavior.
- It does not award XP, complete lessons, submit assignments, or change academic records.
- Navigation is explicit and uses only existing internal routes.

## Future v2 ideas — documentation only

- Page-specific walkthroughs
- First-login onboarding with a safe dismissal model
- Progress-aware next-step guidance
- Teacher-customized guidance
- Optional database-backed completion state after separate approval
- Reconnection with Live AI after environment setup is stable
