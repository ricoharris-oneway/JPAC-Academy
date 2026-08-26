# JPAC Release Process

## Purpose

This process keeps JPAC releases focused, reviewable, and consistent. It combines a read-only repository scan with lane-specific human approval. The scanner never replaces preview testing or approval for protected academic systems.

Run the release scan from the repository root:

```bash
node scripts/jpac-release-check.mjs
```

The command uses Node and Git only. It does not install packages, stage files, run SQL, change database records, create a PR, or merge code.

## Standard release sequence

1. Start a focused branch from the current approved `main` commit.
2. Keep the worktree limited to the approved scope.
3. Run `node scripts/jpac-release-check.mjs` and select the applicable release lane.
4. Run lane-specific validation and complete the release report.
5. Commit and push only explicitly approved files.
6. Create a draft PR to `main`.
7. Complete the preview checklist and resolve blockers.
8. Obtain final human merge approval.
9. Merge with the approved method and message.
10. Run production smoke tests and record a production checkpoint.

## Lane 1: Documentation-only release

Scope: Markdown or other documentation with no runtime, package, configuration, Supabase, SQL, or asset changes.

Automated checks:

- Exact changed-file inventory
- Documentation-only path confirmation
- `git diff --check`
- Package/config/Supabase/SQL scan
- Protected-keyword report classified as documentation

Manual approval:

- Confirm statements accurately describe production state
- Confirm no secrets, private student data, or unsafe operational details are included
- Confirm the file belongs in the requested documentation scope

PR and merge:

- Create a draft PR after the documentation diff is approved
- Merge only after one-file or exact-file scope and rendered content are confirmed

Production checkpoint:

- Optional for routine documentation
- Required when the document declares a production release, migration result, or operational baseline

## Lane 2: Frontend-only release

Scope: UI, routes, styles, browser-local behavior, and frontend tests without database schema or protected academic mutations.

Automated checks:

- Release scan and exact frontend allowlist
- TypeScript validation
- Production Vite build
- Relevant tests
- `git diff --check`
- Protected academic keyword scan

Manual approval:

- Auth and role behavior
- Loading, error, empty, and mobile states
- Preview routes and console behavior
- Confirmation that protected academic workflows were not altered

PR and merge:

- Create a draft PR after local validation passes
- Mark ready only after preview deployment and route checks pass
- Merge after final human approval

Production checkpoint:

- Required for new routes, authentication-sensitive UI, staff/student workflows, or broad visual changes

## Lane 3: SQL/migration release

Scope: Supabase migrations, validation SQL, rollback SQL, functions, policies, triggers, or database artifacts.

Automated checks:

- Exact SQL artifact inventory
- Static SQL and prohibited-object scan
- Read-only preflight
- Migration/post-validation/rollback pairing
- Protected baseline checks

Manual approval:

- Table, function, policy, and data-write scope
- RLS and privilege safety
- Idempotency and existing-object handling
- Rollback isolation
- Explicit authorization before any SQL execution

PR and merge:

- Create artifacts and review them before execution
- Apply only after a passing read-only preflight and explicit approval
- Create/merge the PR only after migration outcome and post-validation are documented

Production checkpoint:

- Always required, including created objects, post-validation result, rollback status, and protected-system confirmation

## Lane 4: Package/config release

Scope: `package.json`, lockfiles, workspace files, build configuration, Vercel configuration, TypeScript configuration, or CI workflows.

Automated checks:

- Dependency and lockfile diff
- Configuration-file inventory
- TypeScript, tests, and production build
- Supply-chain/lifecycle policy checks
- Deployment preview checks

Manual approval:

- Justification for every dependency or configuration change
- Build-script and lifecycle-script review
- Environment-variable and deployment impact
- Rollback plan

PR and merge:

- Use a dedicated focused PR
- Do not combine with feature work unless inseparable and explicitly approved
- Merge only after CI and preview deployment pass

Production checkpoint:

- Required when deployment, runtime, environment, dependency, or build behavior changes

## Lane 5: High-risk academic-engine release

Scope: XP, mastery, progress, enrollment, submissions, reviews, certificates, unlock rules, curriculum publication, service-role behavior, or academic evidence.

Automated checks:

- All frontend/package/SQL checks that apply
- Protected-keyword scan
- Exact function/table/file allowlist
- Dedicated unit/integration tests
- Read-only production baseline and post-change validation when database work is involved

Manual approval:

- Product owner and technical approval
- Academic-rule and student-impact review
- Security/RLS review
- Test-account evidence
- Rollback and stop rules
- Explicit approval for every database action

PR and merge:

- Never bundle with unrelated work
- Create a draft PR only after the complete safety artifact set exists
- Mark ready after preview, test-student, and protected-baseline checks pass
- Merge only after explicit final approval

Production checkpoint:

- Mandatory immediately after release
- Record production commit, protected baselines, smoke tests, database actions, and rollback readiness

## Release artifacts

- Use `docs/templates/JPAC-RELEASE-REPORT-TEMPLATE.md` for the release record.
- Use `docs/templates/JPAC-PREVIEW-TEST-CHECKLIST.md` for preview testing.
- Use `docs/templates/JPAC-PRODUCTION-CHECKPOINT-TEMPLATE.md` after production release.

## Non-negotiable safeguards

- A passing script report does not authorize SQL, deployment, publication, or merge.
- Never infer permission to change student access or protected academic state.
- Never stage unrelated worktree files.
- Never merge a broad branch when a focused release branch is available.
- Always stop on an unexplained changed file, failed validation, or protected-system mismatch.
