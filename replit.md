# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform connecting international students with global universities. It streamlines course discovery, student profile creation, and provides application and course management tools for educational institutions. The platform aims to enhance access to education, reduce administrative burdens, and capitalize on the international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Branding & Accessibility**: Adherence to brand guidelines, WCAG AA standards, dual navigation, and a 3-column admin dashboard with dark mode.
- **AI Chat Agent**: A floating human avatar ("Zan from ANZ Global Education") with a sales-focused personality, guiding users towards registration and course search using RAG-powered knowledge base.
- **Mobile UI Patterns**: Modern mobile-first patterns including sticky bottom CTA bars, mobile bottom tab navigation, collapsing headers, responsive sections, and quick stats strips.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS.
- **Backend**: Node.js Express.js in TypeScript.
- **Authentication**: Supabase-only with email/password, JWT, 2FA, and Google OAuth.
- **API**: RESTful.
- **Real-time**: WebSockets for chat and notifications.
- **AI Integration**: OpenAI API (GPT-4o for content, GPT-4o-mini for web scraping).
- **Database**: PostgreSQL (Neon, Drizzle ORM).
- **Job Queue**: BullMQ with Redis.
- **Web Scraping**: Playwright, Cheerio, robots-parser.
- **Object Storage**: Replit Object Storage is the persistent backup for ALL logo uploads. Static files in `public/institutions/` (project root) serve logos instantly; when a logo is missing (e.g. after redeployment), the `/institutions/:filename` route falls back to Object Storage automatically. `downloadAsBytes` returns an array of chunks — always use `Buffer.concat(chunks.map(...))` NOT `Buffer.from(chunks)`. Production upload path is `public/institutions/` (persistent), dev is `client/public/institutions/`.
- **Server Stability**: `process.exit(1)` intercepted and SIGHUP signal handled in `server/index.ts` to prevent Replit environment signals from crashing the dev server.
- **Cloudflare Cache Prevention**: All `/api/*` routes return `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` headers (set in `server/index.ts` middleware). This prevents Cloudflare from caching API JSON responses, ensuring course names, listings, and all data changes appear immediately on the production site without requiring a cache purge.
- **Soft-Delete for Bulk Actions**: Bulk "deactivate" for institutions and courses sets `isActive: false` + `publishStatus: 'draft'` instead of hard-deleting rows. Data is fully recoverable via the existing Active/Inactive toggle in the admin panel.
- **Authorization**: Scalable Role-Based Access Control (RBAC) with hierarchical permissions.
- **CRM System**: Unified contact management with client status lifecycle, lead rating, Kanban view, and public form integration.
- **Multi-Course Applications**: Support for multiple courses per application with auto-generated IDs.
- **Multi-Region Architecture**: Config-driven system for content filtering, UI rendering, admin data scoping, and feature gating based on region.
- **Filtering & Search**: Discipline-based, course level, natural language, and location-based filtering with map integration.
- **Unified Tag Manager**: Consolidated tagging system across 13 categories.
- **AI Qualification Equivalency System**: AI-powered academic qualification matching with admin approval.
- **Multi-Country Qualification Framework System**: Supports 8 international frameworks with country-based auto-suggestion.
- **Flexible Pricing System**: Dynamic course pricing supporting fixed and tiered models with multiple dimensions.

### Feature Specifications
- **Institution Portal**: Course, application, and team management with AI-powered content generation.
- **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
- **Student Profile / Universal Smart Application Form**: Accordion-based profile with 10 sections, dynamic completion badges, progress bar, conditional fields, and field-level verification with change history and admin approval.
- **Public Pages**: Landing page, course/institution detail pages, and lead generation forms.
- **Dashboards**: CTO, Student, University, and Platform Admin dashboards with consistent UI/UX.
- **Communication**: Facebook-style notifications, WhatsApp-style real-time chat with file sharing (images, documents, drag-and-drop), and Zoho Cliq-style team availability status system.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval.
- **AI Course Thumbnail Generation**: Automatic thumbnail creation using OpenAI DALL-E 3 with async processing.
- **Activity Logging**: CRM-style audit trail.
- **Content & SEO**: Course pages with scholarship info, markdown blog, dynamic SEO, and SEO-friendly slug URLs for institutions and courses.
- **AI-Driven SEO Management**: Comprehensive SEO infrastructure including BreadcrumbList JSON-LD, `seo_metadata` table with AI generation and approval, and admin SEO panel.
- **Workflows**: Institution/Course approval and an 11-stage student application workflow.
- **Draft/Publish Workflow**: Collaborative content creation for institutions and courses.
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes and bulk actions.
- **Maps & Location**: Google Maps integration for campus locations and map-based search.
- **Level 2 Content Blocks CMS**: Admin-facing CMS for static website content.
- **Notification Settings Management**: Admin UI for managing global notification defaults (role-based), per-user notification overrides, and customizable email templates with variable placeholder support. Integrated preference checking in email-service.ts (shouldSendEmailNotification, getCustomEmailTemplate). Tables: global_notification_defaults, user_notification_overrides, email_templates.
- **Meta Pixel Marketing Analytics**: Region-aware Meta (Facebook) Pixel integration. Pixel IDs stored as secrets (`FACEBOOK_PIXEL_ID_BD`, `FACEBOOK_PIXEL_ID_AU`), served via `/api/public/meta-pixel?region=XX`. Core library at `client/src/lib/meta-pixel.ts`, hook at `client/src/hooks/useMetaPixel.ts`. Tracks: PageView (all route changes), Search (course search with 1s debounce), Lead (contact forms, lead dialogs with value/currency), CompleteRegistration (signup), ViewContent (course/institution detail pages with enriched location+type+value params), Contact (contact form), InitiateCheckout (Apply Now button clicks). Initialized globally in AppContent.
- **Meta Conversions API (CAPI)**: Server-side event sending for Lead events in `server/meta-capi.ts`. Fires after every lead form submission (non-blocking, best-effort). Hashes PII (email, phone, name) with SHA-256 before sending. Recovers signal lost to iOS/ad blockers (~30-40%). Requires secrets: `FACEBOOK_CONVERSIONS_API_TOKEN_AU` and `FACEBOOK_CONVERSIONS_API_TOKEN_BD` (from Meta Events Manager → Settings → Conversions API). Gracefully skips if tokens not configured.
- **Google Analytics 4**: GA4 property "ANZ Global Education" (Measurement ID: `G-FR0SX6QEEZ`, GA4 property: `513652914`). Script loaded via `client/index.html` with `send_page_view: false`. SPA page view tracking via `client/src/lib/google-analytics.ts` + `client/src/hooks/useGoogleAnalytics.ts` (fires `page_view` event on every wouter route change). Initialized globally in AppContent alongside Meta Pixel. Both anzglobal.com.au and anzglobal.com.bd report to the same GA4 property.
- **Google Tag Manager**: GTM container `GTM-NTPF5HRG` installed in `client/index.html`. Head script placed as the first element in `<head>`; noscript iframe fallback placed as the first element in `<body>`. Coexists with GA4 direct integration via shared `dataLayer`.

### Security Implementations
- **CSRF Protection**: Double-submit CSRF token pattern.
- **API Logging Sanitization**: Sensitive fields redacted from logs.
- **Session Security**: HTTPOnly cookies with SameSite protection; sessions stored in PostgreSQL.
- **Role-Based Access Control**: All API routes protected by authentication and userType checks.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini, Playwright/Cheerio, and BullMQ.
- **Student Application Portal**: 11-stage workflow with dedicated database tables and UI.
- **Centralized Notification System**: Located in `server/notifications.ts`, providing a notification link registry and real-time WebSocket push.
- **GEO (Generative Engine Optimization)**: Future-ready SEO strategy for AI search engines, including enhanced Schema.org data (Course, FAQ, Organization), tag-based landing pages, cross-linking, and visible FAQ sections.

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