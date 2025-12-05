# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform connecting international students with global universities. Its core purpose is to streamline course discovery, student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform aims to enhance access to education, reduce administrative burdens for universities, and capitalize on the growing international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Color Palette**: Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000.
- **Typography**: Nunito, Open Sans.
- **Accessibility**: WCAG AA standards.
- **Navigation**: Dual navigation system.
- **Admin Dashboard**: 3-column layout with dark mode support.
- **AI Chat Agent**: Floating human avatar design (ATO.gov.au style) with friendly education consultant character named "Zan from ANZ Global Education", gentle floating animation (3s translateY), "Ask Zan" pill button, green online indicator, and accessible keyboard focus states. Chat window features consistent avatar across header, messages, and typing indicator with WCAG-compliant interactions. **Sales-focused personality** guides users toward registration and course search with inline CTA buttons (Search Courses, Register Now, View Institutions, Contact Us). **Topic guardrails** restrict discussions to international education topics only (courses, visas, PR pathways, studying in Australia). Off-topic questions are politely redirected. No private company information disclosed. **RAG-powered knowledge base** auto-rebuilds with fresh platform data (courses, institutions, statistics) on server restart.

### Technical Implementations
- **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
- **Backend**: Node.js Express.js in TypeScript.
- **Authentication**: OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage.
- **API**: RESTful, organized by user type.
- **Real-time**: WebSockets for chat.
- **AI Integration**: OpenAI API (GPT-4o for content generation, GPT-4o-mini for web scraping extraction).
- **Database**: PostgreSQL (Neon, Drizzle ORM) with GIN indexes.
- **Job Queue**: BullMQ with Redis for background scraping jobs and retry logic.
- **Web Scraping**: Playwright (headless browser automation), Cheerio (HTML parsing), robots-parser (robots.txt compliance).
- **Object Storage**: Replit Object Storage.
- **Authorization**: Role-based access control (`userType`) enforced by backend middleware.

### Feature Specifications
- **Institution Portal**: Manages courses, applications, and teams, with AI-powered content generation and DALL-E integration. Features comprehensive application management with stage transitions (limited to Documents Verification, Offer-Letter, GS-Clearance, COE stages for institution users), document request system with NULL field storage for pending uploads, stage history tracking, and activity logging. Institution users can view assigned applications (filtered by their university's courses), request documents from students, and advance applications through workflow stages. All stage enum values aligned across database (shared/schema.ts), ApplicationCard component, and StudentApplications page to prevent type mismatches. Document requests create records with uploaded_by=NULL, document_url=NULL, uploaded_by_role=NULL to indicate pending student uploads. StageDocument interface supports nullable fields for pending requests.
- **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
- **Public Pages**: Landing page, "Study in Australia" page, course detail pages, institution pages, lead generation forms, and contact page.
- **Dashboards**: Super Admin dashboard for CRUD with comprehensive course creation dialog (35+ fields organized in 5 tabs: Basic, Fees & Duration, Location & Dates, Requirements, Additional), and consistent modern UI/UX across Student, University, and Platform Admin dashboards with responsiveness and accessibility. Course creation dialog supports all publicly available course fields including duration variants (text, months, weeks), fees (tuition, application, cost of living), location data, academic requirements, scholarship ranges, media assets (thumbnails, images), and career pathways - with automatic array-to-comma-separated-string conversion for form handling.
- **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs using OpenAI GPT-4o.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval, schema-aware GPT-4o-mini extraction, Playwright/Cheerio, BullMQ job queue, robots.txt compliance, confidence scoring, and side-by-side review UI. Includes AI-powered automatic discovery of course listing pages and pre-configured scraping templates. **Full-website crawling** feature allows admins to input an institution's root URL and automatically crawl the entire website via sitemap.xml parsing and recursive link discovery, detect all course pages using AI, extract data from discovered courses, and present for granular field-level review/approval before importing to platform. Features include InstitutionCrawlerDialog for triggering crawls, ScrapingJobDetail page for real-time progress tracking, and ScrapingReviewDashboard with filtering (All/Pending/Approved/Rejected), aggregate statistics, batch approval, and per-field review capabilities.
- **Activity Logging**: CRM-style audit trail tracking all admin actions with field-level change tracking, user attribution, and human-readable descriptions, displayed via an `ActivityFeed` UI component.
- **CRM System (Phase 1)**: Unified lead management with task assignment and workload management for consultants and admins. Features include:
  - **Unified CRM Leads Module**: Three-tier system (Leads → Contacts → Applications). All lead sources consolidated into single `crmLeads` table with automatic lead creation from contact forms (POST /api/contact/inquiry) and course information requests (POST /api/public/leads). Leads tagged with `leadCreationMethod: "website_form"` for web submissions. Status history tracked in `leadStatusHistory` table. Legacy `studentLeads` and `contactInquiries` tables maintained for backwards compatibility.
  - **Tasks Management**: Database schema with tasks table (title, description, priority, status, due dates, assignee), RESTful API endpoints at /api/tasks, MyTasksPanel component showing assigned tasks with filtering by status/priority.
  - **Internal Notes with @Mentions**: Application-level threaded discussions for team communication (applicationInternalNotes table) with TipTap rich text editor supporting @user mentions. When typing "@", a dropdown shows active team members for selection. Mentions are stored in mentionedUserIds array and displayed as styled chips. Mentioned users receive notifications (type: internal_note_mention). Notes support pinning and author-only deletion.
  - **Follow-up Reminders**: Scheduled reminders linked to tasks/applications (followUpReminders table), CreateReminderModal for quick or custom scheduling, UpcomingRemindersPanel showing pending reminders sorted by urgency.
  - **Admin Dashboard Integration**: CRM Leads tab provides central view of all leads from website forms and contact inquiries. My Tasks tab displays MyTasksPanel (2/3 width) + UpcomingRemindersPanel (1/3 width) side by side. Team Workload tab (admin-only) shows TeamWorkloadPanel for workload distribution visibility.
- **Profile Management**: Student and Admin profile management with role-based security.
- **Content & SEO**: Course pages displaying scholarships/career pathways, markdown-based blog with admin CMS, and comprehensive dynamic SEO for public pages. Blog system features: full CRUD management in admin panel, draft/published workflow, SEO metadata (metaTitle, metaDescription, ogImageUrl), category and tag organization, featured images, and **"Seed Sample Blogs" button** that creates 10 SEO-friendly blog posts about international education topics (student visas, Australian cities, scholarships, English tests, cost of living, PR pathways, etc.) with stock images.
- **Workflows**: Institution/Course approval workflow by platform admin; comprehensive 11-stage student application workflow with visual progress tracking, document management, stage history tracking, and email notifications. Business rules system enforces stage-specific document requirements, role-based stage transition permissions, stage transition validation, and SLA monitoring with warning/critical alerts.
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes (List/Kanban), drag-and-drop stage transitions, circular progress indicators (50% stage position + 50% verified documents), color-coded SLA badges (7-day at-risk, 14-day overdue thresholds), quick filter chips for SLA status, bulk actions toolbar (select all, batch consultant assignment, batch stage transitions), and fully responsive design. Terminal stages (Application Won, Refusal/Refunds, Application Lost) display 100% progress and always show on-track SLA status.
- **Filtering & Search**: Discipline-based course filtering, course level filtering, dynamic animated typing for natural language search, and location-based course filtering with interactive campus badges.
- **Maps & Location**: Google Maps integration for campus locations with custom markers, and normalized campus data.
- **Level 2 Content Blocks CMS**: Admin-facing content management system for static website content with 5 content types:
  - **Testimonials**: Student success stories with ratings (1-5), institution/course info, student photos, draft/published status, display ordering.
  - **FAQs**: Categorized Q&A (general, applications, courses, visas, fees) with rich text answers and display ordering.
  - **Team Members**: Public-facing team profiles with name, role, bio, photos, social links (LinkedIn, Twitter), and visibility controls.
  - **Site Settings**: Key-value configuration (strings, numbers, booleans, JSON) with labels and categories (general, contact, social, branding, SEO).
  - **Content Snippets**: Reusable content blocks keyed by page location and section name for consistent messaging.
  Database: 5 CMS tables (testimonials, faqs, publicTeamMembers, siteSettings, contentSnippets) with draft/published workflow, audit trails (createdById, updatedById), and display ordering.
  Storage: 22 CRUD methods supporting filtering, pagination, and status-based queries.
  API: RESTful endpoints at `/api/admin/cms/...` with role-based access (Super Admin: full CRUD, Platform Admin/Support Manager: create/update, Super Admin only: delete).
  UI: AdminCmsPanel component with 5 tabbed sections accessible via "Website Content" in admin sidebar.
  Activity Logging: All CMS operations logged with entity type, action, and user attribution.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini structured outputs for data extraction, Playwright/Cheerio for web scraping, and BullMQ for job queuing. Features an auto-approval system for high-confidence courses and batch operations for review. **Course detection** uses intelligent heuristics including Australian Training Package Code pattern matching (regex for codes like BSB60720, CHC52021, RII50520), qualification keyword detection (diploma, certificate, advanced-diploma, degree), and comprehensive exclusion filters (blogs, galleries, PDFs, images) to accurately identify course pages during website crawling. **Redis handling**: Queue and worker components use lazy connection with graceful fallback - Redis availability is checked at startup, and if unavailable, background job processing is disabled with clear logging. Manual processing endpoint (`POST /api/admin/scraping/jobs/:jobId/process`) serves as fallback when Redis/BullMQ unavailable in dev environment.
- **Student Application Portal**: Utilizes an 11-stage workflow (Assessment to Visa-Lodgment/Outcome) with dedicated database tables for stages, history, and documents, supported by a REST API and a Student Portal UI for progress tracking and document uploads.

## External Dependencies
- **Authentication Service**: Replit Auth.
- **AI Service**: OpenAI API (GPT-4o, GPT-4o-mini).
- **Vector Database**: Pinecone.
- **Database**: PostgreSQL (Neon).
- **Job Queue**: Redis (BullMQ dependency).
- **Object Storage**: Replit Object Storage.
- **CDN**: Google Fonts CDN.
- **Mapping/Location**: Google Maps JavaScript API, Google Places API.
- **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
- **Email Service**: Resend API.