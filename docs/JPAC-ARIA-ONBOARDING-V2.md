# JPAC Aria Onboarding v2: First-Time Student Welcome Tour

## What the tour does

Aria’s optional seven-step welcome tour shows students the safe, existing path through JPAC Academy: choose a creative path, continue learning, practice skills, submit only when assigned, and build a portfolio. Students start it manually with **Start JPAC Tour** inside the existing Aria guide.

The tour is deterministic rather than AI-driven. Every message, action, and route is reviewed frontend content, so the experience does not generate advice, infer academic status, or make a network request.

## Connection to Aria and Guided Pop-Up Coach

The tour is a third component-state mode alongside page-specific guidance and the original six-step full pathway. It reuses Aria’s approved `/images/aria/aria-guide.png` image, accessible dialog, navigation helper, safety copy, and responsive controls. Opening Aria still begins with page guidance; the welcome tour never auto-opens.

## Tour steps and routes

| Step | Title | Existing route |
| --- | --- | --- |
| 1 | Welcome to JPAC Academy | `/career-pathing` |
| 2 | Choose your creative path | `/career-pathing` |
| 3 | Continue your learning | `/courses` |
| 4 | Practice your skills | `/studio` |
| 5 | Submit when assigned | `/practice-coach` |
| 6 | Build your portfolio | `/certificates` |
| 7 | You’re ready to begin | `/career-pathing` |

## Safety boundaries

- Student-only and click-to-start
- React component-memory state only
- No AI, API, voice, speech synthesis, Supabase, database, upload, `localStorage`, or IndexedDB behavior
- Existing internal routes only
- No XP awards, lesson completion, assignment submission, or academic-record changes
- Page guidance and the original full pathway remain available

## Not included

The tour does not include first-login detection, automatic prompting, dismissed-state persistence, progress-aware decisions, teacher onboarding, voice playback, or Live AI.

## Future v3 ideas — documentation only

- First-login auto prompt with dismiss state
- Optional database-backed onboarding completion
- Parent/student welcome version
- Teacher onboarding version
- Voice clips recorded by JPAC
- Page-specific Aria poses
- Progress-aware guidance later
