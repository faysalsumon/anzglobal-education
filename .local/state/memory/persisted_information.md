# Email Redirect After Confirmation - IN PROGRESS

## User Request
After clicking email confirmation link, redirect users to their specific dashboard based on user type instead of home page.

## Redirect Logic Needed
- Students → `/student/dashboard`
- Institutions (institution_user) → `/university/dashboard`
- Platform Admins (platform_admin) → `/admin/dashboard`

## File to Modify
- `client/src/pages/auth-callback.tsx` - The callback page that handles email confirmation redirects

## Previous Work Completed
- Transactional emails implemented with Resend
- FROM_EMAIL set to `noreply@anzglobal.com.au`
- Welcome, profile reminder, and application submitted email templates added
- Welcome email integrated into auth callback sync flow

## Implementation Approach
1. Read the auth-callback.tsx file
2. Find the redirect logic (currently redirects to home or dashboard)
3. Update to check userType from the synced user response
4. Redirect to appropriate dashboard based on userType
