---
name: Team management — two provisioning paths
description: How admin team members are added to the platform; two separate flows write to different DB columns, which is why role resolution must check multiple sources.
---

## Two paths for adding team members

### Path 1 — Invitation / Create User (Team tab, `AdminTeamPanel`)
- Visible only to `hasFullAdminAccess` (CTO or Branch Manager)
- **Invite**: `POST /api/admin/invitations` → stores row in `invitations` table, emails a link; recipient creates Supabase account via the link. Expires after 7 days.
- **Create User**: `POST /api/supabase-auth/admin/create-user` → creates Supabase account immediately, emails temporary password (user must change on first login).
- Role is stored in `users.roleId` (new RBAC system, `roles` DB table)
- Role options come from `GET /api/admin/invitations/roles` → queries `roles` table where `isActive=true` AND `userType IN ('admin','platform_admin')`
- Invitation statuses: pending / accepted / revoked / expired. Can be resent or revoked from the UI.

### Path 2 — Self-signup with Approval (Users tab, `admin-dashboard.tsx`)
- Applicant self-registers choosing "admin" user type on the public /register page
- Account lands in `users.approvalStatus = 'pending'`
- CTO goes to Users tab → clicks "Approve" → a dialog opens with a **hardcoded role dropdown** (CTO, Platform Admin, Branch Manager, Support Staff, Operations Staff, Accounts Officer)
- Backend sets `approvalStatus = 'approved'` and writes the selected role to `users.role` (legacy string column — NOT `roleId`)
- Can also Reject, which sets `approvalStatus = 'rejected'`

## Users tab — full breakdown

- **Data source**: `GET /api/super-admin/users` (only loads when `hasFullAdminAccess = true`)
- Shows ALL platform users: students, institution admins, admin staff
- **4 stat cards**: Total, Students (userType=student), Institutions (institution_admin/university), Admins (admin/platform_admin). Pending count powers the filter badge.
- **Role column dropdown**: assigns `users.roleId` via `PATCH /api/admin/users/:id/assign-role`. Uses `roles` DB table (new RBAC).
- **Branch column dropdown**: assigns `users.branchId` inline.
- **Status column**: Pending Approval badge / Rejected badge / Active+Inactive toggle button.
- **Actions column**: Pending users → Approve + Reject buttons. Approved users → View / Edit / Delete icon buttons.
- **Sync to CRM button**: `POST /api/crm/contacts/sync-users` — copies student users to CRM contacts. Protected by `requireCrmWriteAccess` (accounts_officer cannot trigger).

## Critical: two columns for role, not one

The approval dialog writes to `users.role` (legacy string).
The Role column dropdown in the Users table writes to `users.roleId` (new RBAC).
A user approved via the dialog will show "Assign role" (blank) in the Role dropdown because `roleId` is still null — they are independent.

**Why this matters:** Backend role-resolution helpers (`getAdminRoleFromReq`, `checkAdminAccess`) must check ALL of:
1. `users.roleId` → resolve display name via `roles` table (Invite/Create User path)
2. `users.role` string column (Self-signup Approval path)
3. `admin_team_members.role` string column (legacy path)
Checking only one will incorrectly deny access for users onboarded via a different path.
