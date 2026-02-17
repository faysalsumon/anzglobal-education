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
- **Object Storage**: Replit Object Storage.
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