---
name: Role Management tab — full codebase setup
description: How the Role Management tab works end-to-end: DB tables, backend routes, frontend component, and what each section does.
---

## Access control
- Tab: `activeTab === "role-management"` — only rendered when `isCTO`
- Listed in `superAdminOnlyTabs` — non-CTO users are redirected away via `validateTabAccess`
- Component: `AdminRoleManagementPanel` (`client/src/components/admin-role-management-panel.tsx`)

## DB tables involved (schema.ts)

### `roles` table
Columns: `id` (uuid PK), `name` (unique varchar, e.g. 'accounts_officer'), `displayName` (e.g. 'Accounts Officer'), `description`, `userType` ('admin' | 'platform_admin'), `hierarchyLevel` (integer, lower = higher authority, e.g. CTO=10 / junior=70), `defaultScope` (enum: 'global' | 'region' | 'branch' | 'self'), `isActive`, `createdAt`, `updatedAt`

### `permissions` table
Columns: `id`, `resource` (e.g. 'courses', 'crm', 'applications'), `action` (e.g. 'read', 'write', 'delete', 'approve'), `displayName`, `description`. Unique constraint on (resource, action).

### `role_permissions` table
Join table linking roles ↔ permissions. Cascade deletes when a role or permission is deleted.

## Backend routes (server/routes.ts)

| Route | Auth | What it does |
|---|---|---|
| `GET /api/admin/roles` | any admin | All active roles |
| `GET /api/admin/roles/:userType` | any admin | Roles filtered by userType |
| `GET /api/admin/role-management/users` | CTO only | Admin+platform_admin users JOIN'd with their role |
| `GET /api/admin/roles/:roleId/permissions` | CTO only | Role + its permissions from role_permissions join |
| `PATCH /api/admin/users/:id/assign-role` | CTO only | Sets `users.roleId`, invalidates permission cache |
| `PATCH /api/admin/roles/:roleId/hierarchy` | CTO only | Updates `hierarchyLevel` + `defaultScope`, clears access context cache |

## Frontend component — two sections

### Section 1: User table with role assignment
- Data: `GET /api/admin/role-management/users` — only admin/platform_admin users (not students/institution admins)
- Shows: Name/email, userType badge, current role (from `users.roleId` join to `roles` table), Active/Inactive status
- "Assign Role" button opens a dialog — role dropdown is filtered by `user.userType` so platform_admin users only see platform_admin roles and admin users only see admin roles
- Saves to `users.roleId` via `PATCH /api/admin/users/:id/assign-role`
- Eye icon next to current role opens Permissions dialog for that role

### Section 2: Role Hierarchy cards
- Data: `GET /api/admin/roles` — all active roles, sorted by `hierarchyLevel` ascending (lowest/highest authority first)
- Each card shows: displayName, Level number, Platform/Admin badge, default scope badge, Permissions button
- Edit (pencil) icon opens a dialog to set `hierarchyLevel` (1–100) and `defaultScope` (global/region/branch/self)
- Saves via `PATCH /api/admin/roles/:roleId/hierarchy` — also calls `clearAccessContextCache()` server-side

### Permissions dialog (shared)
- Opened from both the user table eye icon and the hierarchy card Permissions button
- Loads `GET /api/admin/roles/:roleId/permissions` (only when a roleId is selected)
- Groups permissions by `resource`, shows `action` badges for each resource

## Stat cards (4 at top)
- Total Roles: count of all rows from `GET /api/admin/roles`
- Admin Users: users where userType = 'admin' OR 'platform_admin'
- Platform Admins: users where userType = 'platform_admin'
- With Assigned Roles: users where roleId IS NOT NULL

## Key point: role assignment here vs elsewhere
The Role Management tab writes `users.roleId` — the same column as the Users tab Role dropdown and the Team invite/create flow. It does NOT touch `users.role` (legacy string). The approval dialog (self-signup path) still writes to `users.role`.
