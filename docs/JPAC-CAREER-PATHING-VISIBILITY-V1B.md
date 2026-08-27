# JPAC Career Pathing Visibility v1B

## Purpose

Career Pathing v1B restores the full reviewed 14-path catalog to the authenticated student experience. The current `/career-pathing` route now lets students filter, explore, and locally select a path while seeing connected programs, Creator Tools, portfolio preparation, and teacher review.

## Source of truth

The path identities and descriptive catalog metadata come from the prior reviewed Career Path Explorer definition in repository commit `d448a849996b2e6222d956d20a854ddfc298c501`. The implementation adapts that catalog to the current Career Pathing route rather than creating a second route or inventing replacement paths.

The catalog contains 14 paths grouped by the five established creative categories: Performance, Music Creation & Production, Stage & Screen, Creative Business, and Education & Leadership.

## Student behavior

- All 14 installed paths appear in a responsive filterable grid.
- Selecting **Explore this path** updates only local React UI state.
- Each path shows related JPAC programs and existing Creator Tool recommendations.
- The selected-path roadmap connects learning, practice, portfolio evidence, and teacher review.
- The dashboard summary directs students to the full 14-path experience.

## Safety boundary

Choosing a path helps guide practice. It does not change enrollment or any academic record. This frontend-only release adds no persistence, queries, SQL, Supabase changes, XP or progress mutations, mastery or certificate behavior, submission or review actions, curriculum changes, or new packages.
