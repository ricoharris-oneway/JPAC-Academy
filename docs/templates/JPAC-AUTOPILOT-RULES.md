# JPAC Autopilot Rules

Use this template at the start and end of a low-risk automated release.

## Release request

- Objective:
- Requested branch:
- Base branch and commit:
- Proposed release lane:
- Approved file allowlist:

## Autopilot eligibility

- [ ] Lane is `docs-only release` or `tooling-only release`.
- [ ] Files are limited to `docs/`, `docs/templates/`, or `scripts/jpac-release-check.mjs`.
- [ ] No application runtime files changed.
- [ ] No frontend feature or visual files changed.
- [ ] No package, lockfile, or workspace files changed.
- [ ] No configuration files changed.
- [ ] No Supabase, SQL, migration, rollback, or validation files changed.
- [ ] No media or storage files changed.
- [ ] No implementation-level protected academic findings exist.
- [ ] No SQL was executed and no database record was modified.
- [ ] Release checker and diff checks pass.
- [ ] Vercel/repository checks pass before merge.
- [ ] PR is cleanly mergeable before merge.

If any box cannot be checked, stop and request human approval.

## Mandatory approval triggers

- [ ] App runtime or frontend feature change
- [ ] Production visual testing
- [ ] SQL, migration, rollback, or Supabase change
- [ ] Package, lockfile, workspace, or config change
- [ ] Live AI integration or provider configuration
- [ ] XP, progress, mastery, certificate, enrollment, submission, review, grading, unlock, or curriculum change
- [ ] Failed or unexplained check
- [ ] Merge conflict or unexpected file

Any selected trigger means Autopilot is not authorized.

## Validation evidence

- `node scripts/jpac-release-check.mjs`:
- Release lane:
- Changed-file count:
- Implementation-level protected findings:
- `node --check scripts/jpac-release-check.mjs` when applicable:
- TypeScript/build when applicable:
- `git diff --check`:
- Vercel/checks:
- GitHub mergeability:

## Exact changed files

```text
Paste the complete file list.
```

## Batch update report

### A. Current main

- Starting commit:
- Ending commit:

### B. PRs completed

- None, or list PR, title, merge method, and merge commit.

### C. PRs opened

- None, or list PR, URL, base, head, and status.

### D. PRs blocked

- None, or list the blocker and required approval.

### E. Files changed

- Count:
- Files:

### F. Release lanes

- Lane:
- Qualification:

### G. Checks passed/failed

- Passed:
- Failed:
- Warnings:

### H. Database/package/config status

- SQL/database action:
- Package/lockfile changes:
- Configuration changes:
- Supabase changes:

### I. Items requiring human approval

- None, or list each item.

### J. Recommended next action

- Next action:

## Final decision

- [ ] Eligible for Autopilot continuation
- [ ] Stop and request human approval

Decision reason:
