---
name: Profiles tab — full codebase setup
description: How the Permission Profiles tab works; DB tables, enforcement logic, and the important distinction between Profiles (CRUD on modules) vs Roles (identity + hierarchy).
---

## Access control
- Tab: `activeTab === "profile-management"` — only rendered when `isCTO`
- Listed in `superAdminOnlyTabs` alongside `role-management`
- Component: `AdminProfileManagementPanel` (`client/src/components/admin-profile-management-panel.tsx`)

## What Profiles are (concept)

Profiles answer WHAT a user can do on each module (Create / Read / Update / Delete).
Roles answer WHO the user is (CTO, Branch Manager, Accounts Officer, etc.) and set data scope (global / region / branch / self).

These are two orthogonal permission axes — Salesforce/Zoho style:
- **Role** → identity + data visibility scope
- **Profile** → CRUD action permissions per module

A user has both `users.roleId` (role) and `users.profileId` (profile).

## DB tables (schema.ts)

### `profiles` table
Columns: `id`, `name` (unique, e.g. 'full_access', 'standard', 'data_entry', 'read_only'), `displayName`, `description`, `isSystemProfile` (bool — built-in, can't be deleted), `isActive`, timestamps.

### `profile_permissions` table
Columns: `id`, `profileId` (FK → profiles, cascade delete), `module` (varchar — 'leads' | 'applications' | 'courses' | 'institutions' | 'users' | 'reports' | 'tasks'), `canCreate`, `canRead`, `canUpdate`, `canDelete` (all boolean). Unique constraint on (profileId, module).

### `users.profileId` column
Optional FK to `profiles.id`. Assigned when inviting/creating a user (optional field in invite dialog) or via `PATCH /api/admin/users/:id/access`.

## Backend enforcement (server/access-policy-service.ts)

The `getAccessContext(userId, module)` function (called server-side per request):
1. Fetches `users.profileId` and `users.userType`
2. If `userType === 'platform_admin'` → **full CRUD granted always** (bypasses profile check)
3. If `profileId` is null → defaults to `{canCreate: false, canRead: true, canUpdate: false, canDelete: false}` (read-only fallback)
4. Otherwise → looks up `profile_permissions` row for (profileId, module) → returns actual booleans

The `checkPermission(userId, module, action)` helper wraps this and returns true/false for a single action ('create'|'read'|'update'|'delete').

## Backend routes

| Route | Auth | What it does |
|---|---|---|
| `GET /api/admin/profiles` | any admin | All active profiles (used in invite dialog dropdown + this tab) |
| `GET /api/admin/profiles/:profileId` | any admin | Single profile + its `profile_permissions` rows |
| `PATCH /api/admin/users/:id/access` | CTO or Branch Manager | Sets `users.profileId`, `users.regionId`, `users.branchId` |

## Frontend component — two sections + a dialog

### Section 1: Profile cards (grid)
- Loads `GET /api/admin/profiles` → one card per profile
- Card shows: displayName, description, "System" badge if isSystemProfile
- Clicking a card or "View" opens the detail dialog for that profile

### Section 2: Permission Matrix table (read-only overview)
- Hard-coded logic based on profile name for the matrix display (not from DB):
  - `full_access` → CRUD
  - `standard` → CRU (no delete)
  - `data_entry` → CR
  - `read_only` → R
  - anything else → `-`
- This is a UI shortcut — actual enforcement is done from DB in `getAccessContext()`

### Detail dialog (opened by clicking any profile or row)
- Loads `GET /api/admin/profiles/:profileId`
- Shows a table with one row per module and 4 checkbox-style badges: Create / Read / Update / Delete

## Key gap / current state
- The Profiles tab is **read-only** — there is NO UI to create, edit, or delete profiles from the panel
- Profiles must be seeded directly in the DB (or via a future admin create form)
- The matrix overview is hardcoded by profile name, not read from the actual `profile_permissions` rows — this can drift if DB rows don't match the expected names

## How Profiles connect to the rest of the system
- **Invite flow**: optional `profileId` field in the invite form → stored on the `invitations` row → applied to the new user's account on acceptance
- **Create User flow**: optional `profileId` field → applied immediately to `users.profileId`
- **Role Management tab**: does NOT set profileId — that's handled separately via `PATCH /api/admin/users/:id/access`
