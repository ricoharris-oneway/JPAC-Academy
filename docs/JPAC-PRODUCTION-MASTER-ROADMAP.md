# JPAC Academy Production Master Roadmap

**Status:** Authoritative architecture and implementation sequence
**Owner:** JPAC Academy engineering
**Last updated:** 2026-08-07

This document is the governing implementation guide for JPAC Academy. When an older sprint note, prototype, migration, or feature conflicts with this roadmap, this roadmap controls. No milestone is production-complete until its live production validation gate has passed.

## Product mandate

JPAC Academy is a commercial learning platform for J. Moné's Performing Arts Center. It combines performing-arts education, student progress, gamification, instructor operations, learning analytics, career development, and AI-assisted learning. Architectural decisions must prioritize security, scalability, maintainability, production-data integrity, and a coherent student experience.

## Permanent system ownership

### Wix — storefront and commerce

Wix owns the public website, marketing, membership, authentication initiation, purchases, pricing plans, billing, programs, and email marketing. Wix remains the source of truth for commercial access. JPAC Academy never owns or reconstructs payment state.

### Supabase — canonical learning platform

Supabase owns Academy authentication, profiles, roles, explicit course entitlements, progress, XP, achievements, certificates, AI history, assignments, analytics, instructor data, admin data, and audit data. Official student records must not be stored only in the browser.

### JPAC Academy — learning experience

The Academy application owns dashboards, entitled course access, lessons, practice tools, AI experiences, progress presentation, certificates, and student workflows. Client UI may present authorization state but may never be the authorization boundary.

### ARIA Intelligence — assistive intelligence

ARIA owns personalized learning, recommendations, feedback, coaching, practice evaluation, career guidance, motivation, and analytics. ARIA reads canonical Supabase data and may not directly award official completion, XP, credentials, or roles.

## Canonical data ownership

Every production record has exactly one authoritative owner.

### Wix

- Members
- Purchases
- Pricing Plans
- Billing
- Programs
- Commerce

### Supabase Auth

- Authentication
- Sessions
- JWT identity

### Supabase Database

- Profiles
- Roles
- Entitlements
- Progress
- XP
- Achievements
- Certificates
- Instructor records
- Analytics
- Audit history

### JPAC Academy

- User interface
- Learning experience
- Course presentation
- Practice tools
- AI interaction

### ARIA Intelligence

- Recommendations
- Coaching
- Analysis
- Feedback
- Personalization

No system may duplicate another system's canonical responsibility.

## Non-negotiable production rules

Never duplicate authentication, students, courses, entitlements, progress, or other canonical records. Never bypass or weaken RLS to make a feature work. Never trust a client-supplied user ID for authorization. Never use localhost redirects in production. Never use browser local storage for canonical records.

Always derive identity from `auth.uid()`, preserve production data, use reviewed migrations, enforce least-privilege RLS, reuse existing objects where practical, maintain backward compatibility, and verify build, TypeScript, security, migration behavior, and production rollback.

## Database standards

Production schema changes must satisfy all of the following:

- Forward migration
- Rollback migration
- Idempotent where practical
- No destructive data loss
- Preserve existing production records
- Preserve UUID identity
- Preserve foreign keys
- Preserve indexes unless replaced
- Preserve audit history
- Preserve RLS intent

## Security principles

Always:

- Use `auth.uid()`.
- Enforce RLS.
- Validate server-side.
- Minimize privilege.
- Audit mutations.
- Protect secrets.

Never:

- Trust client parameters.
- Expose service-role keys.
- Expose production secrets.
- Bypass authorization.
- Disable RLS.

## AI governance

ARIA may:

- Recommend
- Explain
- Analyze
- Coach
- Summarize
- Predict
- Personalize

ARIA may not:

- Grant access
- Change roles
- Award certificates
- Award XP
- Modify grades
- Complete lessons
- Delete records
- Override instructor decisions

Official academic records may change only through trusted server-side workflows.

## Entitlement authority rule

Wix Members and explicit Wix identifiers are the canonical source of purchased Academy access. Authorization must follow an explicit relationship such as:

```text
auth.uid()
  → profiles.id
  → wix_member_links.profile_id
  → wix_access_entitlements.profile_id
  → explicit Wix plan/program mapping
  → courses.id
```

Course authorization must not be inferred from normalized, fuzzy, or partial course-title matching. Human-readable names may be displayed or used during an administrative mapping workflow, but they are not an authorization key. Production access requires stable Wix plan/program identifiers mapped explicitly to a canonical course UUID.

## Milestone gates and order

### Milestone 1 — Production Authentication

Scope: Academy activation, password setup, email verification, recovery, auth callback, and session persistence.

Repository status: implemented on `feature/auth-milestone-1`. Production-complete status remains contingent on recorded live invite → callback → password → sign-out → login validation with a new Wix purchaser.

Exit gate:

- Production invite delivery succeeds.
- Redirect never reaches localhost.
- Password is stored through Supabase Auth.
- Subsequent password login succeeds.
- Existing users, profiles, roles, Wix links, and entitlements remain intact.

### Milestone 2 — Student Entitlements

Scope: Wix member synchronization, explicit purchased-course mapping, My Courses, course authorization, lesson authorization, and entitlement-aware RLS.

Repository status: Build 2.1 replaces the unexecuted normalized-title migration with staged explicit-ID preparation and enforcement migrations, a non-destructive rollback path, production validation SQL, and an operator runbook. Production-complete status remains contingent on the recorded live validation gate below.

Required remediation:

- Use explicit Wix plan/program ID → `courses.id` mapping; never authorize from titles.
- Discover production Wix entitlement status vocabulary automatically and review unknown values fail-closed.
- Preserve intended staff lesson-progress operations.
- Supply transactional forward and rollback migrations.
- Validate all RLS changes against student, teacher, admin, developer, expired, cancelled, no-plan, and multiple-plan states.

Exit gate: one real entitled production student sees only purchased courses, opens a purchased course and lesson, and cannot read another student's access or progress. Expired and cancelled access is denied. Existing staff roles continue working.

### Milestone 3 — Canonical Learning Engine

Build and validate canonical lesson completion, persisted lesson progress, module completion, course completion, Continue Learning, Resume Learning, and completion timestamps. Progress must be derived from canonical lesson records.

Existing objects such as `lesson_progress`, `student_learning_state`, and related triggers must be audited and reused or migrated. Do not create a second progression engine.

### Milestone 4 — XP and Gamification

Build XP, levels, achievements, badges, daily streaks, practice streaks, and leaderboards. Reuse and validate existing ledgers and achievement tables. XP must be auditable, idempotent, and awarded only by trusted server-side workflows.

### Milestone 5 — Certificates

Build certificate generation, completion verification, QR validation, instructor approval, and printable credentials. Existing certificate structures are prototypes until completion, authorization, revocation, and verification are production-tested.

### Milestone 6 — ARIA Intelligence

Implement AI tutoring, practice evaluation, personalized curriculum, recommendations, coaching, lesson summaries, progress insight, and motivation. ARIA may recommend actions but cannot directly mutate official completion, XP, credentials, or roles.

### Milestone 7 — Instructor Portal

Implement class management, student monitoring, assignment review, attendance, feedback, and an AI instructor assistant. All cross-student access must be role-authorized and auditable.

### Milestone 8 — Admin Command Center

Implement analytics, student and instructor management, financial reporting, Academy settings, feature flags, AI monitoring, and audit logs. Developer Studio becomes a restricted admin/developer capability for code, API integrations, and system extensions.

### Milestone 9 — Learning Intelligence

Implement predictive analytics, at-risk detection, career recommendations, curriculum optimization, practice optimization, and engagement analytics. Derived intelligence must retain provenance to canonical records.

### Milestone 10 — Mobile Platform

Complete responsive optimization, PWA support, deliberate offline lesson caching, push notifications, mobile certificates, and mobile AI. Offline state must reconcile safely with canonical server records.

### Milestone 11 — Production Launch

Complete security, performance, accessibility, and RLS audits; production deployment; monitoring; backup restoration verification; disaster recovery; documentation; and the launch checklist.

### Milestone 12 — Continuous Production Evolution

After launch:

- Monitor production.
- Optimize performance.
- Expand AI capabilities.
- Add new performing-arts programs.
- Introduce enterprise features.
- Improve accessibility.
- Improve mobile experience.
- Refine analytics.
- Expand integrations.

All future work must continue to follow this roadmap.

## Repository rules

Every feature branch must:

- Build successfully.
- Pass TypeScript.
- Pass `git diff --check`.
- Include migration documentation when applicable.
- Include production validation steps.
- Preserve existing production functionality.

No direct commits to `main`.

Production merges occur only after milestone exit gates are satisfied.

## Production release process

```text
Feature Branch
        ↓
Code Review
        ↓
Security Review
        ↓
Migration Review
        ↓
Preview Deployment
        ↓
Production Validation
        ↓
Pull Request
        ↓
Merge to Main
        ↓
Production Deployment
```

## Required workflow for every future task

1. Inspect repository guidance and existing architecture before editing.
2. Identify canonical identity, ownership, and data paths.
3. Reuse existing tables, functions, triggers, policies, and indexes when correct.
4. Document conflicts and migration dependencies before changing production schema.
5. Preserve production data and provide a rollback path.
6. Enforce authorization server-side with `auth.uid()` and RLS.
7. Run TypeScript, production build, existing tests, lint when configured, and `git diff --check`.
8. Scan for secrets, localhost production URLs, hardcoded identities, browser-only canonical state, and client-side authorization bypasses.
9. Document every migration and exact production validation steps.
10. Keep the milestone pending until live production evidence satisfies its exit gate.

## Handling existing ahead-of-roadmap code

The repository contains partial or prototype implementations for later milestones, including progress, XP, certificates, ARIA, instructor, admin, analytics, and Developer Studio features. Their presence does not mark those milestones complete. Each must be audited for canonical ownership, duplication, RLS, idempotency, production data compatibility, and live validation when its milestone begins.

## Long-term vision

JPAC Academy will become a premier AI-powered performing-arts learning platform combining professional instruction, immersive media, adaptive coaching, gamified progression, and career pathways. Wix remains the commerce layer, Supabase remains the canonical secure learning platform, JPAC Academy remains the student and staff experience, and ARIA remains an assistive intelligence layer governed by canonical data and trusted workflows.
