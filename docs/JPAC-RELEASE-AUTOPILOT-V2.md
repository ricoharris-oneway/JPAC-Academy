# JPAC Release Autopilot v2

## Purpose

JPAC Release Autopilot v2 reduces repeated approval steps for narrowly scoped, low-risk documentation and release-tooling changes. It does not broaden authority for application behavior, infrastructure, database operations, academic systems, deployments, or visual production testing.

Autopilot is a release coordination policy, not a substitute for engineering review. The repository release checker supplies evidence; it does not authorize work outside the rules below.

## Autopilot eligibility

Codex may proceed without stopping only when every condition is true:

- The release lane is `docs-only release` or `tooling-only release`.
- Changed files are limited to `docs/`, `docs/templates/`, or `scripts/jpac-release-check.mjs`.
- No package, lockfile, workspace, configuration, Supabase, SQL, migration, rollback, validation, media, or storage files changed.
- `node scripts/jpac-release-check.mjs` completes and reports the expected low-risk lane.
- `git diff --check` passes.
- Any applicable Vercel and repository checks pass.
- The protected-keyword scan reports zero implementation-level findings.
- No SQL was executed and no database record was modified.
- The PR is open, has the intended base and head, contains the approved files only, and is cleanly mergeable.
- No unresolved review thread, merge conflict, or failed check remains.

When eligible, Codex may create the branch, draft or update the approved documentation/tooling files, validate, explicitly stage the allowlisted files, commit, push, create a focused draft PR, mark it ready after checks pass, and squash-merge it.

## Mandatory stop conditions

Codex must stop and request explicit approval before proceeding when a release includes or requires:

- Application runtime behavior changes.
- Frontend features, routes, components, styles, or production-facing visual changes.
- SQL, migrations, rollbacks, validation SQL, or any database execution.
- Supabase schema, Auth, Storage, Edge Function, RLS, policy, trigger, or RPC changes.
- `package.json`, lockfile, workspace, dependency, lifecycle-script, or package-manager changes.
- Build, deployment, TypeScript, Vite, Vercel, environment, CI, or other configuration changes.
- Protected academic logic or protected academic data.
- XP, progress, mastery, certificate, enrollment, submission, review, grading, unlock, or curriculum changes.
- Live AI integration, model-provider configuration, credentials, or student context sent to an AI provider.
- Failed, pending beyond a reasonable check window, or unexplained checks.
- Merge conflicts or changed-file discrepancies.
- Production visual testing, signed-in browser testing, or test-account activity.
- Any action outside the explicit release scope.

Autopilot must not reinterpret a high-risk change as documentation/tooling merely because documentation or a script describes it.

## Release lanes

### Docs-only release

Allowed scope:

- Markdown documents under `docs/`.
- Markdown templates under `docs/templates/`.

Required evidence:

- Exact changed-file inventory.
- Docs-only checker classification.
- No prohibited file categories.
- Zero implementation-level protected findings.
- `git diff --check` passes.
- PR checks pass and the PR is mergeable.

### Tooling-only release

Allowed scope:

- `scripts/jpac-release-check.mjs`.
- Supporting documentation and templates under `docs/`.

Additional requirements:

- The script must remain read-only.
- Node built-ins only; no package addition.
- No staging, commit, push, PR, merge, SQL, deployment, or file mutation performed by the checker.
- Run `node --check scripts/jpac-release-check.mjs`.
- Run the checker against the current branch and inspect its complete report.
- Run TypeScript and production build when reasonable or when the tooling change could affect repository validation.

### All other lanes

Frontend-only, SQL/migration, package/config, and protected academic-engine releases are outside Autopilot. Codex must stop and obtain explicit approval at the relevant boundary.

## Required operating sequence

1. Fetch and confirm the latest approved `main` commit.
2. Create a focused branch from current `main`.
3. Make only the approved documentation/tooling changes.
4. Run the release checker and `git diff --check`.
5. Confirm the exact file allowlist and zero prohibited categories.
6. Stage files individually by explicit path.
7. Confirm the staged file list and run `git diff --check --cached`.
8. Commit and push the focused branch.
9. Create a draft PR to `main` with exact scope and safety evidence.
10. Verify the PR file list, base, head, checks, and mergeability on GitHub.
11. Mark ready and squash-merge only when every Autopilot eligibility condition remains true.
12. Confirm the merge commit and produce the batch update report.

## Release checker interpretation

- `docs-only release` is eligible only when every release-scope file is under `docs/`.
- `tooling-only release` is eligible only when the release scope includes `scripts/jpac-release-check.mjs` and every other file is under `docs/`.
- Documentation/tooling keyword matches are reported for transparency.
- Any implementation-level protected finding requires a stop and human review.
- `REVIEW REQUIRED` means the report must be inspected; it is not a failure by itself.
- A passing classification never authorizes database, package, config, runtime, or protected academic work.

## PR and merge safeguards

Before an Autopilot merge, confirm:

- PR is open and not already merged.
- Base and head match the requested branches.
- Head SHA matches the validated commit.
- Changed-file count and names match the allowlist.
- Vercel and required repository checks pass.
- Raw GitHub mergeability is `true` and mergeable state is clean when the normalized connector is stale or ambiguous.
- Squash title matches the approved release title.

If any condition differs, stop and report the blocker. Do not force a merge.

## Batch update report

Every Autopilot run should conclude with:

### A. Current main

- Starting main commit
- Ending main commit, if merged

### B. PRs completed

- PR number, title, merge method, and merge commit

### C. PRs opened

- PR number, URL, base, head, and draft/ready status

### D. PRs blocked

- PR number or branch, blocker, and required human decision

### E. Files changed

- Exact count and file list for each release

### F. Release lanes

- Checker classification and why it qualifies

### G. Checks passed/failed

- Release checker, syntax, TypeScript/build when applicable, diff check, Vercel, and mergeability

### H. Database/package/config status

- SQL/database actions
- Package/lockfile changes
- Configuration changes
- Supabase changes

### I. Items requiring human approval

- Explicit list, or `None`

### J. Recommended next action

- One concrete next step based on the verified state

## Audit expectation

Autopilot reports must distinguish actions actually performed from claims documented in a file. They must name blockers plainly, preserve exact commit and PR identifiers, and never claim a check passed without evidence.
