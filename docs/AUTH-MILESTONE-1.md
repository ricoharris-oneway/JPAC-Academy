# Milestone 1: Core Authentication Platform

## Production configuration

Set `ACADEMY_SITE_URL` in Vercel to the canonical HTTPS Academy origin (currently `https://jpac-academy.vercel.app`). The Wix sync endpoint uses this value to build invite callbacks and rejects localhost or non-HTTPS values.

In Supabase Dashboard → Authentication → URL Configuration:

1. Set **Site URL** to the canonical production Academy origin.
2. Add `https://jpac-academy.vercel.app/auth/callback` to **Redirect URLs**. Add the same `/auth/callback` path for any custom production domain.
3. Remove localhost redirect URLs from the production project.

In Authentication → Email Templates, keep Supabase's confirmation URL variable in Invite, Recovery, Confirmation, and Magic Link templates. Do not hard-code a localhost or app-root URL in a template.

## Password-recovery URL configuration

In the production Supabase project, open **Authentication → URL Configuration** and enter:

- **Site URL:** `https://jpac-academy.vercel.app`
- **Redirect URLs:**
  - `https://jpac-academy.vercel.app/auth/callback?next=%2Freset-password&type=recovery`
  - `http://localhost:5173/auth/callback?next=%2Freset-password&type=recovery`
  - `https://jpac-academy.vercel.app/auth/callback?next=%2Fset-password&type=invite`
  - `http://localhost:5173/auth/callback?next=%2Fset-password&type=invite`

The application sends password recovery with an exact redirect such as:

- Production: `https://jpac-academy.vercel.app/auth/callback?next=%2Freset-password&type=recovery`
- Local development: `http://localhost:5173/auth/callback?next=%2Freset-password&type=recovery`

Supabase requires the `redirectTo` value to match an allowed Redirect URL, so enter the complete values including their query strings. Do not change the production Site URL to localhost. Keep the Recovery email template's standard Supabase confirmation URL variable so Supabase verifies the one-time token before returning to the Academy callback. If additional confirmation or magic-link callback variants are used, allowlist their exact `redirectTo` values separately.

## Authentication lifecycle

- A new Wix purchaser is invited by `/api/wix-sync` with `/auth/callback?next=%2Fset-password&type=invite` as the production redirect.
- The callback exchanges PKCE codes (and accepts Supabase's URL session handling), validates that a session exists, and sends invite/recovery users to `/set-password`.
- Password setup uses `supabase.auth.updateUser()` and then opens `/courses`.
- Forgot Password uses `resetPasswordForEmail()` with the same production callback.
- Verification and magic-link callbacks enter the authenticated Academy at a safe internal path.

## Manual test procedure

1. Use a new email address with no Supabase auth user or profile.
2. POST a unique Wix purchase event to `/api/wix-sync`, including member, active order, and program enrollment data.
3. Verify one auth user, profile, Wix member link, entitlement, and program enrollment share the same profile UUID; verify the profile role is `student`.
4. Open the invitation email. Confirm the browser lands on the production `/auth/callback`, then `/set-password`, never localhost.
5. Set an eight-or-more-character password. Confirm the browser opens `/courses` and the synchronized Wix records remain associated with the same profile.
6. Sign out, sign in with the new password, and confirm access succeeds.
7. On `/login`, choose **Forgot password?**, submit the email, open the recovery email, and confirm it returns through `/auth/callback` to `/set-password`.
8. Exercise a confirmation link and a magic link; confirm each establishes a session and enters the Academy without showing password setup.
9. While signed out, request `/courses`, `/admin`, and `/developer`; confirm each redirects to `/login`.
10. As a student, request `/admin`, `/teacher`, and `/developer`; confirm role-protected routes redirect to `/`. Repeat with teacher, admin, and developer accounts to verify only the intended roles enter.
11. Re-deliver the same Wix event and confirm it is idempotent. Deliver a later event for the same member and confirm profile ID, role, entitlements, and Wix links are preserved.
