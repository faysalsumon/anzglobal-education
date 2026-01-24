# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect international students with global universities. Its primary purpose is to streamline the process of course discovery, student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform aims to enhance access to education, reduce administrative burdens, and capitalize on the international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Branding**: Adherence to ANZ Global Education's brand identity with a specific color palette and typography.
- **Accessibility**: WCAG AA standards, dual navigation, 3-column admin dashboard with dark mode.
- **AI Chat Agent**: Floating human avatar ("Zan from ANZ Global Education") with a sales-focused personality, guiding users towards registration and course search, employing topic guardrails and a RAG-powered knowledge base.
- **Mobile UI Patterns**: Modern mobile-first patterns including:
  - **Sticky Bottom CTA Bar**: Always visible on mobile (z-50) with Save, Apply, and action buttons.
  - **Mobile Bottom Tab Navigation**: Icon-only section navigation bar (z-40) above CTA bar with smooth scroll-to-section.
  - **Collapsing Header**: Header hides on scroll down, reappears on scroll up using `useScrollDirection` hook.
  - **Responsive Sections**: `ResponsiveSection` component shows Cards on desktop, collapsible Accordions on mobile.
  - **Quick Stats Strip**: Horizontally scrollable key course stats visible at top on mobile.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
- **Backend**: Node.js Express.js in TypeScript.
- **Authentication**: Supabase-only authentication with email/password, JWT, password reset, TOTP 2FA, and Google OAuth.
- **API**: RESTful.
- **Real-time**: WebSockets for chat and notifications, with Supabase token validation.
- **AI Integration**: OpenAI API (GPT-4o for content generation, GPT-4o-mini for web scraping).
- **Database**: PostgreSQL (Neon, Drizzle ORM).
- **Job Queue**: BullMQ with Redis.
- **Web Scraping**: Playwright, Cheerio, robots-parser.
- **Object Storage**: Replit Object Storage.
- **Authorization**: Scalable Role-Based Access Control (RBAC) with hierarchical permissions, utilizing "Profiles DO, Roles SEE" design pattern across various user types, roles, permission profiles, and scope levels.
- **CRM System**: Unified contact management (clients, employees, external, partners, providers_rep) with automatic status transitions, lead rating, Kanban view, and advanced filtering.
- **Multi-Course Applications**: Support for multiple courses per application, with auto-generated human-readable IDs and API endpoints for management.
- **Filtering & Search**: Discipline-based, course level, natural language, and location-based filtering with cascading location filters and map integration.
- **Unified Tag Manager**: Consolidated tagging system for courses and institutions across 13 categories.
- **AI Qualification Equivalency System**: AI-powered academic qualification matching and cross-country equivalency generation with admin approval workflow.
- **Multi-Country Qualification Framework System**: Comprehensive course level management supporting 8 international frameworks with country-based auto-suggestion.
- **Flexible Pricing System**: Dynamic course pricing supporting fixed and tiered models with multiple dimensions (payment options, study modes, location-based pricing), installment configuration, and per-tier pricing management.

### Feature Specifications
- **Institution Portal**: Course, application, and team management with AI-powered content generation and DALL-E integration.
- **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
- **Public Pages**: Landing page, "Study in Australia" page, course/institution detail pages, lead generation forms.
- **Dashboards**: CTO, Student, University, and Platform Admin dashboards with consistent UI/UX and overview statistics.
- **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval and AI-powered course detection.
- **Activity Logging**: CRM-style audit trail tracking admin actions.
- **Content & SEO**: Course pages with scholarship/career pathway info, markdown-based blog with admin CMS, and dynamic SEO.
- **AI-Driven SEO Management**: Comprehensive SEO infrastructure with:
  - BreadcrumbList JSON-LD structured data on course and institution detail pages for rich search snippets
  - `seo_metadata` database table with entity type (course/institution/blog), meta fields, AI generation tracking, and approval workflow (pending/approved/rejected)
  - Admin SEO Panel with AI-powered meta generation using GPT-4o-mini, Google search preview, and bulk generation capabilities
  - All SEO routes authorized for marketing_executive role (via support_staff mapping)
  - Zod validation on POST /api/admin/seo with meta title (10-60 chars), meta description (50-160 chars) constraints
- **Workflows**: Institution/Course approval workflow; comprehensive 11-stage student application workflow with visual progress tracking and notifications.
- **Draft/Publish Workflow**: Collaborative content creation for institutions and courses with content approval system.
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes (List/Kanban), drag-and-drop stage transitions, and bulk actions.
- **Maps & Location**: Google Maps integration for campus locations with custom markers, map-based search, and geocoding.
- **Level 2 Content Blocks CMS**: Admin-facing CMS for static website content (Testimonials, FAQs, Team Members, Site Settings).

### Security Implementations
- **CSRF Protection**: Double-submit CSRF token pattern.
- **API Logging Sanitization**: Sensitive fields redacted from logs.
- **Session Security**: HTTPOnly cookies with SameSite protection; sessions stored in PostgreSQL.
- **Role-Based Access Control**: All API routes protected by authentication and userType checks.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini for structured data extraction, Playwright/Cheerio, and BullMQ for job queuing.
- **Student Application Portal**: 11-stage workflow with dedicated database tables and Student Portal UI.
- **Centralized Notification System**: Located in `server/notifications.ts`, providing a notification link registry, auto-generated links, type-safe helper functions, and real-time WebSocket push.

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