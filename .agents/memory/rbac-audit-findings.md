---
name: RBAC audit — confirmed bugs and fixes applied
description: Results of the June 2026 full RBAC architectural audit; what was fixed, what was left intentional, and what still needs work.
---

## Architecture layers (brief)

- **Layer 1 — Roles**: `roles` table + `users.roleId` + `checkAdminAccess()` — enforced on every backend route
- **Layer 2 — Profiles**: `profiles` table + `users.profileId` + `getAccessContext()` — built but not wired to routes yet
- **Layer 3 — Legacy**: `users.role` string + `admin_team_members.role` — REMOVED (see below)

## Fixes applied (June 2026)

### isMarketingExecutive detection (client/src/hooks/useAuth.ts)
Was checking `user?.roleName` (not a field returned by `/api/supabase-auth/user`) → always false.
Fixed to: `adminRole === "marketing_executive"`.

### isConsultant (client/src/hooks/useAuth.ts)
Was `adminRole === "support_staff"` (legacy name).
Fixed to: `adminRole === "senior_consultant" || adminRole === "junior_consultant"`.

### Legacy role resolution priority (server/routes.ts)
The `resolvedAdminRole` in the `/api/supabase-auth/user` endpoint was:
`adminMember?.role || rbacAdminRole || legacyUserRole`
Which meant legacy admin_team_members table silently overrode the new RBAC roleId.
Fixed to: `user.roleId ? roleDetails?.name : null` — RBAC only, legacy removed.

### Legacy Tier 2 + Tier 3 removed from checkAdminAccess (server/routes.ts)
Removed the `users.role` string fallback (Tier 2) and `admin_team_members` fallback (Tier 3) from `checkAdminAccess()`.
`checkAdminAccess()` now only uses `users.roleId` → `roles` table.

### Missing tabs from validTabs (client/src/pages/admin-dashboard.tsx)
Added: `seo-metadata`, `tags`, `qualification-types`, `entry-requirement-templates`
These tabs were rendered in the dashboard and in the sidebar but deep-linking via `?tab=` or `#` was broken.

## Intentional design decisions (NOT bugs)

- **Branch Managers cannot see the Management section** — Role Management and Profiles are CTO-only by design at this stage. Branch managers only see CRM and People.
- **support_staff role not in seed-roles.ts** — This is a legacy concept only. All actual staff now use specific role names (senior_consultant, junior_consultant, marketing_executive etc).

## Still needs work (not yet fixed)

- **Profiles table is empty** — No seed-profiles.ts exists. The 4 built-in profiles (full_access, standard, data_entry, read_only) need seeding. The permission matrix in the UI is hardcoded by name to paper over this.
- **Profile enforcement not wired** — `getAccessContext()` and `checkPermission()` in `access-policy-service.ts` are not called from any route in `routes.ts`. Profile-based CRUD gating is currently decorative.

## Key invariants to maintain

- `adminRole` on the frontend comes from `user.adminRole` which is set by the `/api/supabase-auth/user` endpoint as `roleDetails?.name` (the role name string like `'marketing_executive'`).
- All frontend role checks should use `adminRole` directly (e.g. `adminRole === 'marketing_executive'`), NOT `user.roleName`.
- `checkAdminAccess()` now requires `users.roleId` to be set. Users without roleId will only pass the basic userType check (no specific role gating).
