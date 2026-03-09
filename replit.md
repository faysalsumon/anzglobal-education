# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect international students with universities globally. It aims to simplify course discovery, student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform's vision is to improve access to education, reduce administrative overhead, and capture opportunities in the international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The platform adheres to ANZ Global Education's brand identity, using a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility, meeting WCAG AA standards, is a key priority, featuring a dual navigation system and a 3-column admin dashboard with dark mode support.

### UI/UX Decisions
- **Branding & Accessibility**: Adherence to brand guidelines, WCAG AA standards, dual navigation, and a 3-column admin dashboard with dark mode.
- **AI Chat Agent**: A floating human avatar ("Zan from ANZ Global Education") with a sales-focused personality, guiding users towards registration and course search using a RAG-powered knowledge base.
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
- **Object Storage**: Replit Object Storage for persistent logo backups and general file storage, with a fallback mechanism for missing files.
- **Server Stability**: Robust error handling to prevent server crashes in the Replit environment.
- **Cloudflare Cache Prevention**: API routes configured to prevent Cloudflare caching for immediate data consistency.
- **Soft-Delete for Bulk Actions**: Institutions and courses are soft-deleted (`isActive: false`, `publishStatus: 'draft'`) for data recoverability.
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
- **Communication**: Facebook-style notifications, WhatsApp-style real-time chat with file sharing, and Zoho Cliq-style team availability status.
- **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction.
- **AI Web Scraping**: Automated course data extraction with human-in-the-loop approval.
- **AI Course Thumbnail Generation**: Automatic thumbnail creation using OpenAI DALL-E 3 with async processing.
- **Activity Logging**: CRM-style audit trail.
- **Content & SEO**: Course pages with scholarship info, markdown blog, dynamic SEO, and SEO-friendly slug URLs for institutions and courses.
- **AI-Driven SEO Management**: Comprehensive SEO infrastructure including Schema.org data, AI generation and approval for metadata, and an admin SEO panel.
- **Workflows**: Institution/Course approval and an 11-stage student application workflow.
- **Draft/Publish Workflow**: Collaborative content creation for institutions and courses.
- **Application Management Module**: Enhanced CRM-style application management with dual-view modes and bulk actions.
- **Maps & Location**: Google Maps integration for campus locations and map-based search.
- **Level 2 Content Blocks CMS**: Admin-facing CMS for static website content.
- **People / HR Module (Attendance)**: HR/team management hub with attendance tracking, webcam photo capture, time tracking, and RBAC-scoped reports.
- **Notification Settings Management**: Admin UI for managing global notification defaults, per-user overrides, and customizable email templates.
- **Meta Pixel Marketing Analytics**: Region-aware Meta (Facebook) Pixel integration for tracking key user actions.
- **Course-Level Visibility**: Courses can be set to 'public' or 'private', controlling visibility to logged-in students or all users.
- **Team Channels (Cliq-style Messaging)**: Full Slack/Cliq-style messaging in the admin panel, including channels, DMs, real-time updates, and attachments.
- **Task System (Enhanced)**: Task management system with comment threads, @mentions, and visibility for both assignees and creators.
- **Meta Conversions API (CAPI)**: Server-side event sending for Lead events, enhancing tracking accuracy.
- **Google Analytics 4**: GA4 integration for comprehensive website analytics.
- **Google Tag Manager**: GTM container installed for managing analytics and marketing tags.
- **PageSpeed Optimisations**: Multi-sprint effort to achieve PageSpeed 95+ through various frontend and backend optimizations.
- **WCAG AA Colour Contrast**: Adherence to WCAG AA color contrast guidelines for improved accessibility.

### Security Implementations
- **CSRF Protection**: Double-submit CSRF token pattern.
- **API Logging Sanitization**: Sensitive fields redacted from logs.
- **Session Security**: HTTPOnly cookies with SameSite protection; sessions stored in PostgreSQL.
- **Role-Based Access Control**: All API routes protected by authentication and userType checks.

### System Design Choices
- **AI Web Scraping System**: Combines dynamic schema introspection, GPT-4o-mini, Playwright/Cheerio, and BullMQ.
- **Student Application Portal**: 11-stage workflow with dedicated database tables and UI.
- **Centralized Notification System**: Provides a notification link registry and real-time WebSocket push.
- **GEO (Generative Engine Optimization)**: Future-ready SEO strategy for AI search engines, including enhanced Schema.org data, tag-based landing pages, cross-linking, and visible FAQ sections.

## External Dependencies
- **Authentication Service**: Supabase Auth.
- **AI Service**: OpenAI API (GPT-4o, GPT-4o-mini).
- **Vector Database**: Pinecone.
- **Database**: PostgreSQL (Neon).
- **Job Queue**: Redis (via BullMQ).
- **Object Storage**: Replit Object Storage.
- **CDN**: Google Fonts CDN.
- **Mapping/Location**: Google Maps JavaScript API, Google Places API.
- **Email Service**: Resend API.