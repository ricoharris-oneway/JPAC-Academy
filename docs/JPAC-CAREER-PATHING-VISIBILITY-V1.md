# JPAC Career Pathing Visibility v1

## Purpose

Career Pathing now leads the authenticated student experience so students can connect daily learning to a creative future. The dashboard starts with a career-path invitation and deterministic **Today’s Career Move**, while the authenticated `/career-pathing` page connects career direction, published learning, Creator Tool practice, portfolio preparation, and teacher review.

## Student experience

- Choose a temporary on-page creative direction without changing an account or enrollment.
- Follow the visible flow: career goal → current course → Creator Tool practice → portfolio evidence → teacher review.
- Open existing Creator Tools through career-skill recommendations.
- Use JPAC Coach after starting with a career goal.

The eight existing Creator Tools are mapped to student-friendly career skills. No new practice engine or tool was created.

## Frontend-only boundary

Career choices and daily motivation are deterministic presentation state. Nothing is persisted. The release adds no query, database table, API, external service, live AI behavior, or media behavior.

Career Pathing does not change enrollment, complete lessons, award XP or mastery, update progress, issue certificates, submit or approve assignments, invoke review actions, or publish curriculum. Teacher review remains the authoritative review pathway.

## Future engine

A separately reviewed future phase could add student-saved career goals, teacher-approved milestones, portfolio alignment, and career-specific recommendations. That phase would require explicit data-model, authorization, minor-safety, migration, and rollback review before implementation.
