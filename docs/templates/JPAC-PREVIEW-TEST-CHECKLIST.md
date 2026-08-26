# JPAC Preview Test Checklist

## Preview identity

- PR:
- Preview URL:
- Head commit:
- Tester:
- Browser/device:
- Date/time:

## Access and navigation

- [ ] Signed-out behavior is correct
- [ ] Student navigation is correct
- [ ] Teacher navigation is correct
- [ ] Admin navigation is correct
- [ ] Unauthorized roles cannot open protected routes
- [ ] No blank screens or unexpected redirects

## Route checks

| Route | Test account/role | Expected result | Actual result | PASS/FAIL |
| --- | --- | --- | --- | --- |
| `/` | | | | |
| | | | | |

## Workflow checks

- [ ] Primary student workflow passes
- [ ] Loading state is visible
- [ ] Error state is visible and useful
- [ ] Empty state is safe
- [ ] Mobile layout is usable
- [ ] No unexpected console errors
- [ ] Existing unrelated workflows remain intact

## Protected-system checks

- [ ] No unexpected XP event
- [ ] No mastery/progress mutation
- [ ] No certificate creation
- [ ] No enrollment/access change
- [ ] No draft curriculum exposure
- [ ] No unexpected submission/review action
- [ ] No media upload or activation

## Evidence and issues

Screenshots/recordings:

```text
List evidence links or filenames.
```

Issues:

| Severity | Route | Description | Reproduction | Owner |
| --- | --- | --- | --- | --- |
| | | | | |

## Preview recommendation

- [ ] PASS — ready for final merge approval
- [ ] WARN — safe with documented follow-up
- [ ] BLOCK — do not merge

Notes:
