# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform connecting international students with global universities. It aims to streamline course discovery, student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform seeks to enhance access to education, reduce administrative burdens, and capitalize on the international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Color Palette**: Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000.
- **Typography**: Nunito, Open Sans.
- **Accessibility**: WCAG AA standards, dual navigation, 3-column admin dashboard with dark mode.
- **AI Chat Agent**: Features a floating human avatar ("Zan from ANZ Global Education") with a sales-focused personality, guiding users towards registration and course search. It employs topic guardrails and a RAG-powered knowledge base.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
- **Backend**: Node.js Express.js in TypeScript.
- **Authentication**: Supabase-only authentication with email/password, JWT tokens, password reset, TOTP 2FA, and Google OAuth.
- **API**: RESTful.
- **Real-time**: WebSockets for chat and instant notifications, with Supabase token validation.
- **AI Integration**: OpenAI API (GPT-4o for content generation, GPT-4o-mini for web scraping).
- **Database**: PostgreSQL (Neon, Drizzle ORM).
- **Job Queue**: BullMQ with Redis for background jobs.
- **Web Scraping**: Playwright, Cheerio, robots-parser.
- **Object Storage**: Replit Object Storage.
- **Authorization**: Scalable Role-Based Access Control (RBAC) with hierarchical permissions, utilizing "Profiles DO, Roles SEE" design pattern.
  - **User Types**: `platform_admin`, `admin`, `student`, `institution_admin`.
  - **Roles**: 9 distinct roles (e.g., CTO, CEO, Branch Manager, Student) with defined hierarchy levels.
  - **Permission Profiles**: Four profiles (Full Access, Standard, Data Entry, Read Only).
  - **Scope Levels**: Global, region, branch, self.
  - **Modules**: Leads, applications, courses, institutions, users, reports, tasks.
  - **Access Policy Service**: Manages access context, CRUD permissions, and effective scope with caching.
  - **Organization Structure**: Regions → Branches.

### Feature Specifications
- **Institution Portal**: Manages courses, applications, and teams, with AI-powered content generation and DALL-E integration. Includes application management with stage transitions and document requests.
- **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
- **Public Pages**: Landing page, "Study in Australia" page, course detail pages, institution pages, lead generation forms, and contact page.
- **Dashboards**: CTO dashboard with CRUD operations, comprehensive course creation dialog, and consistent UI/UX across Student, University, and Platform Admin dashboards. Admin Dashboard Overview provides stats and quick actions.
- **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval, schema-aware GPT-4o-mini extraction, and full-website crawling with AI-powered course detection.
- **Activity Logging**: CRM-style audit trail tracking admin actions with field-level change tracking.
- **CRM System (Phase 1)**: Unified lead management with task assignment, internal notes, and follow-up reminders.
- **Profile Management**: Student and Admin profile management with role-based security.
- **Content & SEO**: Course pages with scholarship/career pathway info, markdown-based blog with admin CMS, and dynamic SEO.
- **Workflows**: Institution/Course approval workflow by platform admin; comprehensive 11-stage student application workflow with visual progress tracking, document management, and email notifications.
- **Draft/Publish Workflow**: Collaborative content creation for institutions and courses with `publishStatus`, `publishedAt`, `publishedByUserId` fields. Content is only public when published and approved. Includes course transfer system.
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes (List/Kanban), drag-and-drop stage transitions, circular progress indicators, color-coded SLA badges, quick filter chips, and bulk actions.
- **Filtering & Search**: Discipline-based, course level, natural language search, and location-based course filtering.
- **Unified Tag Manager**: Consolidated tagging system for courses and institutions with 13 categories, flexible assignment, and an Admin UI for management.
- **Maps & Location**: Google Maps integration for campus locations with custom markers.
- **Level 2 Content Blocks CMS**: Admin-facing CMS for static website content including Testimonials, FAQs, Team Members, Site Settings, and Content Snippets.

### Security Implementations
- **CSRF Protection**: Double-submit CSRF token pattern.
- **API Logging Sanitization**: Sensitive fields redacted from logs.
- **Session Security**: HTTPOnly cookies with SameSite protection; sessions stored in PostgreSQL.
- **Role-Based Access Control**: All API routes protected by authentication and `userType` checks.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini for structured data extraction, Playwright/Cheerio for scraping, and BullMQ for job queuing. Includes intelligent heuristics and auto-approval.
- **Student Application Portal**: Utilizes an 11-stage workflow with dedicated database tables and a Student Portal UI.
- **Centralized Notification System**: Located in `server/notifications.ts`, provides:
  - **Notification Link Registry**: Maps each notification type to its deep-link URL template for direct navigation
  - **Auto-generated Links**: If no link is provided, the system auto-generates based on notification type and metadata
  - **Helper Functions**: Type-safe helper functions for each notification type (e.g., `notifyLeadMention`, `notifyLeadAssigned`, `notifyTaskAssigned`)
  - **Real-time Delivery**: Automatic WebSocket push to connected users
  - **Adding New Notification Types**: 
    1. Add the type to `NotificationType` union
    2. Add a link template to `NOTIFICATION_LINK_REGISTRY`
    3. Create a helper function for easy notification creation

## External Dependencies
- **Authentication Service**: Supabase Auth.
- **AI Service**: OpenAI API (GPT-4o, GPT-4o-mini).
- **Vector Database**: Pinecone.
- **Database**: PostgreSQL (Neon).
- **Job Queue**: Redis (via BullMQ).
- **Object Storage**: Replit Object Storage.
- **CDN**: Google Fonts CDN.
- **Mapping/Location**: Google Maps JavaScript API, Google Places API.
- **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
- **Email Service**: Resend API.