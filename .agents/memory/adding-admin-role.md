---
name: Adding new AdminRole
description: Checklist for wiring up a new admin role across the full RBAC stack — backend types, route guards, finance access, CRM guards, application scope, frontend nav, and UI buttons
---

## Checklist — add `new_role` to the platform

### server/routes.ts
1. `AdminRole` type union — add `| 'new_role'`
2. `addAdminTeamMemberSchema` z.enum — add `'new_role'`
3. `updateAdminTeamMemberRoleSchema` z.enum — add `'new_role'`
4. First `roleToLegacy` map (roleId path, ~line 396) — add `'new_role': '<legacy_equivalent>'`
5. Second `roleToLegacy` map (requiredRoles path, ~line 439) — add `'new_role': '<legacy_equivalent>'`
6. Both legacy `users.role` allowed arrays (~lines 413, 496) — add `'new_role'`

**Why:** `checkAdminAccess` has three tiers (roleId → roleToLegacy, users.role direct, admin_team_members.role). All must recognise the new role string or access is denied on at least one path.

**Legacy mapping rule:** Map `new_role` to the nearest equivalent legacy role (e.g. `operations_staff`) so it automatically passes all existing route guards that check for that legacy role — not to `new_role` itself. Mapping to itself means only routes that explicitly list `new_role` in their required-roles array will grant access; any existing guard that does not list it will deny.

### server/accounting-routes.ts
- Add to `FINANCE_ADMIN_ROLES` array (line 44) if the role needs finance access
- If the role maps to a legacy role in roleToLegacy (e.g. `operations_staff`), that legacy role must **also** be in `FINANCE_ADMIN_ROLES` so roleId-based users pass the finance check
- `requireFinanceAdmin` must use `req.supabaseUser?.id || req.user?.claims?.sub || req.user?.id` — NOT just `req.user?.id` (Supabase auth puts id in supabaseUser, not directly on user)

### server/crm-routes.ts
- Apply `requireCrmWriteAccess` to **all** non-note CRM mutation routes, not just the obvious CRUD ones. Check every `router.post/patch/put/delete` for missing guard. Hidden routes include:
  - `POST/PATCH/DELETE /contacts/:contactId/institutions`
  - `POST /contacts/:id/upload-photo`
  - `POST /contacts/:id/applications`
  - `PUT /leads/:id/preferences`
- Notes routes intentionally skip this — all admins can add notes

### server/application-workflow-routes.ts
- For roles that need global application read (cross-branch), add an explicit bypass before the `accessContext` scope filter block in `GET /api/admin/applications` (~line 428)
- Pattern: query `adminTeamMembers` for the userId, check if `role === 'new_role'`, then gate the entire scope-filter block on `!isNewRole`
- The `accessContext.defaultScope` from `getUserAccessContext` does NOT automatically reflect legacy roles stored in `admin_team_members.role` — it only reflects the new RBAC `roleId` system. Legacy-invited users default to 'self' scope without this explicit bypass.

### client/src/hooks/useAuth.ts
- Add `new_role: ['section1', 'section2']` to `ROLE_NAV_SECTIONS`
- Add `const isNewRole = adminRole === 'new_role'` computed flag and export it
- Add `|| isNewRole` to `isGlobalScope` if the role needs cross-branch UI data

### client/src/pages/admin-dashboard.tsx
- Add `<SelectItem value="new_role">Role Label</SelectItem>` to the user approval dropdown

### client/src/components/admin-chat-widget.tsx
- Add `'new_role': "Role Label"` to `roleLabels` in `buildGreeting`

### client/src/components/app-sidebar.tsx
- Add `if (adminRole === "new_role") return "Role Label Portal";` to `getPortalLabel`

### CRM UI read-only guards (crm-leads-panel.tsx + crm-contacts-panel.tsx)
- Add `isNewRole` to useAuth destructuring
- Wrap "Add Lead" / "Add Contact" buttons with `{!isNewRole && ...}`
- Pass `isNewRole` as prop to LeadDetailView / ContactDetailView
- Guard all Edit/Delete header buttons and section pencil-edit buttons with `!isNewRole`

### DB admin_team_members table
- The `role` column is varchar(30) with no enum constraint — no migration needed for new role strings
- For the DB `roles` table (used by admin-team-panel.tsx RBAC roleId flow), seed the role if it should appear in the new invite UI dropdown
