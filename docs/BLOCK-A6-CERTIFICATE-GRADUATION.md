# Block A6 — Certificate and Graduation Automation

Block A6 completes the learning lifecycle after Block A5 marks a Wix-linked program complete.

## Automatic trigger

A certificate is evaluated whenever `student_learning_state` changes to:

- `completion_status = complete`
- `progress = 100`
- approved assignment count equals total required assignments
- average score is at least 70

The process is idempotent. Re-running completion cannot create a duplicate active certificate for the same student and course.

## Automatic records

A6 creates or updates:

- `certificates`
- `graduation_events`
- `student_portfolio_documents`
- `student_timeline`
- `student_notifications`
- `certificate_email_queue`
- `aria_completion_recommendations`
- `integration_outbox`

## Certificate document

A printable certificate is available at:

`/api/certificate-document?token=<VERIFICATION_TOKEN>`

The page can be printed or saved as PDF using the browser. The existing public verification page links directly to this document.

## Public verification

The existing `/verify/:token` page uses the rebuilt public `verify_credential` function. It returns only active or issued credentials.

## Notifications

Student, guardian, teacher, and admin email jobs are queued when valid recipient addresses exist. Actual email delivery requires the future production email worker/provider configuration. In-app student notification is created immediately.

## Wix return

Certificate issuance is added to `integration_outbox` as a retry-safe `certificate_issued` event. Delivery begins after the production Wix receiver URL is configured.

## Operational check

After applying the master Block A SQL installer, query:

```sql
select * from public.jpac_a6_status;
```

Expected fields:

- `certificates_automatically_issued`
- `certificate_documents_available`
- `pending_certificate_notifications`
- `graduation_errors`
- `last_certificate_issued_at`
