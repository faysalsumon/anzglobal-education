---
name: Adding new AdminRole
description: Checklist for wiring up a new admin role across the full RBAC stack — backend types, route guards, finance access, CRM guards, frontend nav, and UI buttons
---

## Checklist — add `new_role` to the platform

### server/routes.ts
1. `AdminRole` type union — add `| 'new_role'`
2. `addAdminTeamMemberSchema` z.enum — add `'new_role'`
3. `updateAdminTeamMemberRoleSchema` z.enum — add `'new_role'`
4. First `roleToLegacy` map (no-requiredRoles branch, ~line 400) — add mapping
5. Second `roleToLegacy` map (requiredRoles branch, ~line 440) — add mapping
6. Both legacy `users.role` allowed arrays (~lines 413, 496) — add `'new_role'`

**Why:** `checkAdminAccess` has three tiers (roleId, users.role, admin_team_members). All must recognise the new role string or access is denied.

### server/accounting-routes.ts
- Add to `FINANCE_ADMIN_ROLES` array (line 44) if the role needs finance access
- `requireFinanceAdmin` must use `req.supabaseUser?.id || req.user?.claims?.sub || req.user?.id` — NOT just `req.user?.id` (Supabase auth puts id in supabaseUser, not directly on user)

### server/crm-routes.ts
- Add `requireCrmWriteAccess` middleware to any route that should be read-only for the new role (post/patch/delete contacts and leads)
- Notes routes intentionally skip this — all admins can add notes

### client/src/hooks/useAuth.ts
- Add `new_role: ['section1', 'section2']` to `ROLE_NAV_SECTIONS`
- Add `const isNewRole = adminRole === 'new_role'` computed flag
- Add to return value
- If the role needs cross-branch data access, add `|| isNewRole` to `isGlobalScope`

### client/src/pages/admin-dashboard.tsx
- Add `<SelectItem value="new_role">Role Label</SelectItem>` to the user approval dropdown (~line 3813)

### client/src/components/admin-chat-widget.tsx
- Add `new_role: "Role Label"` to `roleLabels` in `buildGreeting`

### client/src/components/app-sidebar.tsx
- Add `if (adminRole === "new_role") return "Role Label Portal";` to `getPortalLabel`

### CRM UI read-only guards (crm-leads-panel.tsx + crm-contacts-panel.tsx)
- Add `isNewRole` to useAuth destructuring at the top of each panel
- Wrap "Add Lead" / "Add Contact" buttons with `{!isNewRole && ...}`
- Pass `isNewRole` as `isAccountsOfficer`-style prop to LeadDetailView / ContactDetailView
- Guard Edit/Delete header buttons and all section pencil-edit buttons with `!isNewRole`

### DB admin_team_members table
- The `role` column is varchar(30) with no enum constraint — no migration needed
- For the DB `roles` table (used by admin-team-panel.tsx RBAC roleId flow), seed the role if it should appear in the new invite UI dropdown
