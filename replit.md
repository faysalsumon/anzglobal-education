# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect international students with global universities. Its primary purpose is to streamline course discovery, student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform aims to enhance access to education, reduce administrative burdens for universities, and capitalize on the growing international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Color Palette**: Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000.
- **Typography**: Nunito, Open Sans.
- **Accessibility**: WCAG AA standards, dual navigation, 3-column admin dashboard with dark mode.
- **AI Chat Agent**: Features a floating human avatar ("Zan from ANZ Global Education") with a sales-focused personality to guide users towards registration and course search. It employs topic guardrails to restrict discussions to international education and uses a RAG-powered knowledge base.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
- **Backend**: Node.js Express.js in TypeScript.
- **Authentication**: Supabase-only authentication system (Replit Auth completely removed as of December 2025):
  - **Supabase Auth**: Email/password authentication with JWT tokens, password reset flows, and TOTP 2FA support. Uses `@supabase/supabase-js` with server-side JWT verification and automatic user sync.
  - **Google OAuth**: Integrated via Supabase Auth with secure server-side user type validation. User type (student/institution) is stored in localStorage before OAuth redirect, then sanitized on the backend to prevent privilege escalation - only "student" and "institution_admin" are allowed via OAuth sync; platform_admin requires manual approval.
  - **Login Portals**: `/admin/login` (platform admin), `/institution/login` (institution partners), `/auth` (students) - all using Supabase signInWithPassword.
- **API**: RESTful.
- **Real-time**: WebSockets for chat and instant notifications. Shared `wsClients` map (`server/websocket-clients.ts`) enables cross-module real-time messaging.
- **AI Integration**: OpenAI API (GPT-4o for content generation, GPT-4o-mini for web scraping extraction).
- **Database**: PostgreSQL (Neon, Drizzle ORM).
- **Job Queue**: BullMQ with Redis for background jobs.
- **Web Scraping**: Playwright, Cheerio, robots-parser.
- **Object Storage**: Replit Object Storage.
- **Authorization**: Scalable Role-Based Access Control (RBAC) with granular permissions:
  - **User Types (4 only)**: `platform_admin`, `admin`, `student`, `institution_admin` - strictly enforced, roles are separate from user types
  - **Database Schema**: `roles`, `permissions`, and `role_permissions` tables for dynamic role management
  - **9 Roles**: cto (highest platform role, formerly super_admin), ceo, cfo, branch_manager, marketing_executive, senior_consultant, junior_consultant, student, institution_rep
  - **CTO Role**: The 'cto' role has full platform access. Both 'cto' and 'ceo' map to highest admin privileges. The CTO role replaced 'super_admin' as of January 2026.
  - **30+ Permissions**: Resource:action format (e.g., 'dashboard:read', 'users:write', 'applications:approve')
  - **Permission Service** (`server/permission-service.ts`): Caching (5-min TTL), hasPermission(), getUserPermissions(), isPlatformAdmin()
  - **Permission Middleware** (`server/permission-middleware.ts`): requirePermission(), requireAdmin(), requirePlatformAdmin()
  - **API Endpoints**: `/api/auth/permissions`, `/api/admin/roles`, `/api/admin/roles/:roleId/permissions`, `/api/admin/role-management/users`, `/api/admin/users/:id/assign-role`
  - **Role Management UI**: CTO-only panel in admin dashboard (Management > Role Management) for viewing users with roles, assigning roles, and viewing role permissions
  - **Legacy Support**: `checkAdminAccess()` maps new roles to legacy AdminRole types; server normalizes legacy 'university' values to 'institution_admin' on persist
  - **IMPORTANT**: UniversityRole 'super_admin' (for institution team hierarchy) is SEPARATE from AdminRole 'cto' (for platform admins). Do not confuse the two contexts.

### Feature Specifications
- **Institution Portal**: Manages courses, applications, and teams, with AI-powered content generation and DALL-E integration. Includes comprehensive application management with specific stage transitions and a document request system.
- **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
- **Public Pages**: Landing page, "Study in Australia" page, course detail pages, institution pages, lead generation forms, and contact page.
- **Dashboards**: CTO dashboard for CRUD operations with a comprehensive course creation dialog, and consistent UI/UX across Student, University, and Platform Admin dashboards. Admin Dashboard Overview provides at-a-glance stats (tasks, leads, applications, courses, institutions) and quick actions for team members.
- **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval, schema-aware GPT-4o-mini extraction, and full-website crawling with AI-powered course detection and a review dashboard.
- **Activity Logging**: CRM-style audit trail tracking all admin actions with field-level change tracking and user attribution.
- **CRM System (Phase 1)**: Unified lead management with task assignment, internal notes with @mentions, and follow-up reminders. Integrates into the admin dashboard with dedicated tabs for leads, tasks, and team workload.
- **Profile Management**: Student and Admin profile management with role-based security.
- **Content & SEO**: Course pages with scholarship/career pathway info, markdown-based blog with admin CMS, and dynamic SEO. Blog system includes full CRUD, draft/published workflow, SEO metadata, categories, tags, and a feature to seed sample blogs.
- **Workflows**: Institution/Course approval workflow by platform admin; comprehensive 11-stage student application workflow with visual progress tracking, document management, and email notifications. Business rules enforce stage-specific requirements and role-based permissions.
- **Draft/Publish Workflow**: Collaborative content creation system for institutions and courses:
  - **Database Schema**: `publishStatus` field ('draft' | 'published') on both universities and courses tables, with `publishedAt` timestamp and `publishedByUserId` for audit trail
  - **Ownership Fields (Courses)**: `createdByUserId`, `updatedByUserId`, `assignedToUserId` for tracking content ownership and assignment
  - **UI Controls**: Institution and course creation/edit dialogs have "Save Draft" and "Publish" buttons; tables show publish status badges (blue "Published", outline "Draft") and filter dropdowns
  - **Public Visibility Rule**: Content only appears on public API endpoints when publishStatus='published' AND approvalStatus='approved' AND isActive=true
  - **Workflow**: Draft → Publish → Approval → Active (content can be saved as draft during creation, then published when ready for review)
  - **Course Transfer System**: Courses can be transferred between team members via `/api/super-admin/courses/:id/transfer` endpoint with automatic `course_assigned` notification
  - **Team Member View**: `/api/admin/my-courses` endpoint returns only courses created by or assigned to the current user (for non-admin team members)
  - **Publish/Unpublish Endpoints**: `/api/super-admin/courses/:id/publish` and `/api/super-admin/courses/:id/unpublish` for course visibility control
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes (List/Kanban), drag-and-drop stage transitions, circular progress indicators, color-coded SLA badges, quick filter chips, and bulk actions.
- **Filtering & Search**: Discipline-based, course level, natural language search, and location-based course filtering.
- **Maps & Location**: Google Maps integration for campus locations with custom markers.
- **Level 2 Content Blocks CMS**: Admin-facing CMS for static website content including Testimonials, FAQs, Team Members, Site Settings, and Content Snippets. Supports CRUD operations, draft/published workflow, and audit trails.

### Security Implementations
- **CSRF Protection**: Double-submit CSRF token pattern using `csrf-csrf` package.
- **API Logging Sanitization**: Sensitive fields are redacted from logs; response bodies logged only on errors.
- **Session Security**: HTTPOnly cookies with SameSite protection. Sessions stored in PostgreSQL.
- **Role-Based Access Control**: All API routes protected by authentication and `userType` checks.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini for structured data extraction, Playwright/Cheerio for scraping, and BullMQ for job queuing. Includes intelligent heuristics for course detection and an auto-approval system. Redis availability is checked at startup with graceful fallback.
- **Student Application Portal**: Utilizes an 11-stage workflow (Assessment to Visa-Lodgment/Outcome) with dedicated database tables and a Student Portal UI.

## External Dependencies
- **Authentication Service**: Supabase Auth (exclusive - all authentication flows use Supabase).
- **AI Service**: OpenAI API (GPT-4o, GPT-4o-mini).
- **Vector Database**: Pinecone.
- **Database**: PostgreSQL (Neon).
- **Job Queue**: Redis (BullMQ dependency).
- **Object Storage**: Replit Object Storage.
- **CDN**: Google Fonts CDN.
- **Mapping/Location**: Google Maps JavaScript API, Google Places API.
- **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
- **Email Service**: Resend API.