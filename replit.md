# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect international students with universities globally. Its primary purpose is to simplify course discovery, facilitate student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform aims to improve access to education, reduce administrative burdens for universities, and tap into the expanding international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-11-20: CRM-Style Activity Logging System
- **Implemented comprehensive activity logging** similar to Zoho/Salesforce/Facebook for tracking all admin actions
- Created `activityLogs` database table with JSONB for field-level change tracking, actor denormalization, and search optimization
- Built centralized logging utility (`server/activity-logger.ts`) with 17 action types (created, updated, deleted, approved, rejected, assigned, etc.) across 12 entity types
- Added activity log API endpoints (`GET /api/admin/activity-logs`, `GET /api/admin/activity-logs/entity/:type/:id`) with pagination and filtering
- Created `ActivityFeed` UI component with avatars, colored action badges, delta chips showing field changes, and skeleton loading states
- Integrated logging into key operations: institution/course approval/rejection, scraped course management, user/application/lead CRUD
- Added "Activity Logs" tab to admin dashboard (Tools section) with full-admin access control
- **Status**: ✅ Fully wired end-to-end, architect approved

### 2025-11-19: Web Scraping Authentication Fix
- **Fixed 403 "Admin access required" error** when creating scraping jobs via email/password authentication
- Added `isAuthenticated` middleware to scraping routes registration  
- Updated all 8 scraping route handlers to use `checkAdminAccess` pattern compatible with email/password sessions
- Exported `checkAdminAccess` function from routes.ts for use by scraping routes
- Fixed user ID extraction from `req.user.claims.sub` instead of direct `req.user.userType` check
- Fixed button data-testid mismatch (`button-start-scraping`)
- **Status**: ✅ Authentication working, jobs can be created successfully for institutions like Albright Institute

## System Architecture

### UI/UX and Features
The platform adheres to ANZ Global Education's brand identity, using a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority. It features a dual navigation system and a 3-column admin dashboard with dark mode support.

Key features include:
-   **Institution Portal**: Manages courses, applications, and teams, with AI-powered content generation and DALL-E integration.
-   **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
-   **Public Pages**: Landing page, "Study in Australia" page, course detail pages, institution pages, lead generation forms, and contact page.
-   **Authentication**: Student authentication modal with social login options, supporting Replit Auth and planned Firebase integration.
-   **Dashboards**: Super Admin dashboard for CRUD, and consistent modern UI/UX across Student, University, and Platform Admin dashboards with responsiveness and accessibility.
-   **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
-   **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs using OpenAI GPT-4o.
-   **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval workflow. Features schema-aware GPT-4o-mini extraction, Playwright/Cheerio scraping, BullMQ job queue, robots.txt compliance, confidence scoring, and side-by-side review UI for admin approval/rejection before merging to production courses table.
-   **Activity Logging**: CRM-style audit trail tracking all admin actions with field-level change tracking, user attribution, and human-readable descriptions. Features colored action badges, delta chips showing before/after values, filtering by action/entity type, and entity-specific timelines. Accessible via "Activity Logs" tab in admin dashboard (full-admin access only).
-   **Profile Management**: Student and Admin profile management with role-based security.
-   **Content & SEO**: Course pages displaying scholarships/career pathways, markdown-based blog infrastructure, and comprehensive dynamic SEO for public pages.
-   **Workflows**: Institution/Course approval workflow by platform admin.
-   **Filtering & Search**: Discipline-based course filtering with 15 categories and sub-disciplines, course level filtering with 14 standardized levels, dynamic animated typing for natural language search, and location-based course filtering with interactive campus badges on cards.
-   **Maps & Location**: Google Maps integration for campus locations with custom markers, and normalized campus data for precise location-based course search.
-   **AI Chat Agent**: RAG-powered AI assistant with a compact, Replit-style animated icon (ribbons/bookmarks with diagonal pencil). Positioned at bottom-20 right-3 (mobile) and bottom-24 right-4 (desktop) to prevent header overlap. Button sizes: 48px mobile, 56px desktop. Chat window: max-w-[340px] mobile, max-w-[360px] desktop, height min(480px, calc(100vh - 180px)). Compact header with small avatar (28px) and reduced text sizes. Uses Pinecone vector database for platform-specific knowledge and OpenAI GPT-4o-mini. Includes event-driven auto-updates for knowledge base, close/minimize buttons, and supports both authenticated and anonymous users.

### Technical Implementation
-   **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Node.js Express.js in TypeScript.
-   **Authentication**: OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage.
-   **API**: RESTful, organized by user type.
-   **Real-time**: WebSockets for chat.
-   **AI Integration**: OpenAI API (GPT-4o for content generation, GPT-4o-mini for web scraping extraction).
-   **Database**: PostgreSQL (Neon, Drizzle ORM) with GIN indexes.
-   **Job Queue**: BullMQ with Redis for background scraping jobs and retry logic.
-   **Web Scraping**: Playwright (headless browser automation), Cheerio (HTML parsing), robots-parser (robots.txt compliance).
-   **Object Storage**: Replit Object Storage.
-   **Authorization**: Role-based access control (`userType`) enforced by backend middleware.

## External Dependencies
-   **Authentication Service**: Replit Auth.
-   **AI Service**: OpenAI API (GPT-4o for content, GPT-4o-mini for scraping).
-   **Vector Database**: Pinecone.
-   **Database**: PostgreSQL (Neon).
-   **Job Queue**: Redis (required for production deployment - BullMQ dependency).
-   **Object Storage**: Replit Object Storage.
-   **CDN**: Google Fonts CDN.
-   **Mapping/Location**: Google Maps JavaScript API, Google Places API.
-   **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
-   **Email Service**: Resend API.

## AI Web Scraping System Architecture

### Overview
The AI web scraping system automates course data extraction from institution websites with human-in-the-loop approval. It combines dynamic schema introspection, GPT-4o-mini structured outputs, Playwright/Cheerio scraping, and BullMQ job queuing.

### Components
1. **Schema Introspection** (`server/schema-introspection.ts`): Dynamically reads Drizzle schema to generate AI prompts that adapt to current database fields, ensuring extracted data matches production schema.

2. **AI Extraction Service** (`server/ai-extractor-service.ts`): Uses OpenAI GPT-4o-mini with structured outputs to extract course data from HTML. Provides confidence scores (0-1) and warnings for missing/uncertain fields.

3. **Web Scraper Service** (`server/web-scraper-service.ts`): Playwright headless browser automation with Cheerio HTML parsing. Features robots.txt compliance, rate limiting, and provenance tracking (source URL, timestamp).

4. **Job Queue** (`server/scraping-queue.ts`, `server/scraping-worker.ts`): BullMQ-based background processing with retry logic (3 attempts, exponential backoff). Worker processes crawl jobs asynchronously, storing results in staging table.

5. **API Routes** (`server/scraping-routes.ts`): Admin endpoints for triggering crawls (POST /api/admin/scraping/jobs), viewing job status (GET), and reviewing/approving/rejecting scraped courses (PUT /approve, PUT /reject). All routes use Zod validation and admin-only middleware.

6. **Admin UI** (`client/src/components/admin-scraping-panel.tsx`): Management dashboard with statistics, job monitoring, pending review tab with confidence scores/warnings, side-by-side comparison dialog, and review history. Integrated into admin dashboard "Web Scraping" tab.

### Database Tables
- **scrapingJobs**: Tracks crawl jobs (status: pending/running/completed/failed/cancelled, progress, metadata)
- **scrapedCourses**: Staging area for extracted courses with review status (pending/approved/rejected), confidence scores, AI warnings, source URLs, and reviewer notes

### Workflow
1. Admin triggers crawl job with institution URL via UI
2. BullMQ worker fetches HTML, extracts courses using GPT-4o-mini
3. Scraped courses saved to staging table with confidence scores
4. Admin reviews courses in UI with side-by-side comparison
5. Approved courses merged to production courses table
6. Rejected courses logged with notes for improvement

### Production Deployment Requirements
⚠️ **Redis Server Required**: BullMQ depends on Redis for job queue persistence. Configure `REDIS_URL` environment variable pointing to Redis instance before deploying.

### Development Notes
- Redis connection errors in development are expected (no local Redis server)
- Scraping worker starts on server boot but gracefully handles missing Redis
- Job queue functionality requires production Redis for testing
- Admin UI works independently of Redis for viewing existing scraped data