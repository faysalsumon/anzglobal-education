# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered platform designed to streamline international education by connecting universities with prospective students. It offers intelligent course discovery, AI-assisted student profile creation, and comprehensive application/course management tools for institutions. The platform aims to improve global access to education and reduce administrative burdens for universities, tapping into the significant market potential of cross-border education.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX and Features

The platform features a modern AI-style branding with gradient backgrounds and a contemporary navigation system. **Desktop users** experience a horizontal top navigation bar with logo, menu items, notifications, and user profile. **Mobile users** enjoy an app-style bottom tab navigation (Instagram/Twitter style) preparing for future native mobile app launch. Complete navigation parity ensures all features are accessible on both desktop and mobile devices.

The platform offers dual user experiences: an **Institution Portal** for managing courses, applications, and teams (including AI-powered content generation and image management with DALL-E integration for campus images), and a **Student Experience** focused on intelligent course discovery, AI-assisted profile creation, streamlined applications, favorites, and course comparison tools.

Key features include a clean **Landing Page** with prominent search, a tabbed **Student Authentication Modal** supporting social and email/password logins, and a detailed **Public Course Detail Page**. Lead generation forms capture unauthenticated user inquiries. A comprehensive **Contact Us Page** with category-based submissions is available.

For administration, a **Super Admin Dashboard** provides full CRUD operations. **Public Listings** display institutions and courses with dynamic filtering. A Facebook-style **Notifications** system provides real-time updates. A WhatsApp-style **Real-time Chat** facilitates direct messaging between users, with restricted initiation to prevent spam.

**Student Document Management** offers organized, color-coded folders with multi-format file uploads. An **Enterprise CSV Bulk Import** system allows super admins and support managers to upload, validate, and approve large datasets for universities and courses, including templates, per-row validation, and transactional execution. An **AI Institution Data Extraction** feature (super admin only) securely extracts institution data from website URLs using OpenAI GPT-4o, with stringent security measures like rate limiting, domain allowlisting, and SSRF protection.

**Student Profile Management**: Comprehensive education history and language test score tracking with full CRUD operations. Students can add multiple education records (level, institution, field of study, GPA) and language test scores (IELTS, TOEFL, PTE, Duolingo) with intelligent validation. 100% profile completion (personal info + ≥1 education + ≥1 language score) is required for application submission.

**Course Pages**: Both student and public course detail pages display scholarship as a fixed value ("Up to X%") rather than a range, making it more student-friendly. Career pathways section shows potential career roles and detailed career progression when data is available. Institution pages display scholarship as a range to show the full scholarship opportunity.

### Technical Implementation

The **frontend** is built with React, TypeScript, Vite, Shadcn/ui (New York style), Radix UI, and Tailwind CSS, using Wouter for routing and TanStack Query for server state. Forms are managed with React Hook Form and Zod.

**Navigation System**: Dual navigation architecture separating public and authenticated experiences:

**Public Pages** (landing, courses, institutions):
- Use **PublicLayout** component wrapping **PublicHeader** for consistent navigation
- **PublicHeader** features two-tier navigation:
  - Blue utility bar (#4F5DBE) with TOP INSTITUTIONS, COURSES IN DEMAND, KNOWLEDGE BASE, BLOG, STUDENT LOGIN
  - White main navigation with logo (home link), FIND INSTITUTES, FIND COURSES, SERVICES dropdown, ABOUT, FREE COUNSELING button
- Mobile: Hamburger menu (Sheet component) with organized sections (QUICK LINKS, NAVIGATION, SERVICES)
- Student login uses proper anchor links for accessibility (except landing page which has modal)
- Breadcrumbs on list pages (Home > Current Page) provide additional navigation

**Authenticated Dashboard** (all user types):
- **TopNavBar** (Desktop): Horizontal navigation with logo, menu items, notifications, and user menu. Sticky positioning with z-[9999].
- **MobileBottomNav** (Mobile <768px): App-style bottom tabs with 6 navigation items, icons, labels, active indicators, and unread badges.
- **Navigation Parity**: All user types have identical navigation items on both desktop and mobile:
  - Students (6 items): Dashboard, Courses, Applications, Documents, Messages, Profile
  - Universities (6 items): Dashboard, Institutions, Courses, Applications, Team, Messages
  - Admins (5-6 items): Dashboard, Courses, Institutions, Messages, Profile, Manage (super_admin/support_manager only)

The **backend** uses Node.js Express.js in TypeScript. Authentication is handled by OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage. The API is RESTful and organized by user type. Real-time chat uses WebSockets. AI integration leverages the OpenAI API (GPT-4o) for content generation. Shared Zod schemas ensure type-safe validation, and Multer/Sharp handle image processing.

**Data storage** utilizes PostgreSQL via Neon's serverless driver and Drizzle ORM. The schema supports sessions, users (universities, students, admins), university profiles (including comprehensive `campusAddresses` JSONB and scholarship ranges), courses, applications, student profiles, and real-time chat data. GIN indexes optimize array and JSONB field filtering. Replit Object Storage is used for images.

**Authentication & Authorization** relies on Replit's OIDC service. Express-session manages sessions with PostgreSQL storage. Role-based access control uses `userType` (`university`, `student`, `admin`) with a granular admin hierarchy. Backend middleware (`checkAdminAccess()`) enforces security. A **Central Login Portal** at `/admin/login` provides unified authentication for all user types, intelligently redirecting users to their respective dashboards post-login.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider).

**AI Service**: OpenAI API (GPT-4o model).

**Database**: PostgreSQL (e.g., Neon).

**Object Storage**: Replit Object Storage.

**CDN**: Google Fonts CDN.

**Mapping/Location**: Google Places API (for address autocomplete in university campus addresses).

**Key NPM Packages**:
- **UI**: Radix UI, Shadcn/ui, Lucide React, Tailwind CSS
- **Forms**: react-hook-form, zod
- **Data**: @tanstack/react-query, drizzle-orm
- **Auth**: openid-client, passport, express-session, bcrypt
- **Image Processing**: Multer, Sharp
- **Real-time**: ws (WebSocket)
- **Google Maps**: @googlemaps/js-api-loader
- **CSV Processing**: papaparse

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`