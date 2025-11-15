# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect universities with prospective students globally. Its primary purpose is to streamline international education by offering intelligent course discovery, AI-assisted student profile creation, and comprehensive application/course management tools for educational institutions. The platform aims to enhance global access to education, reduce administrative burdens for universities, and capitalize on the growing cross-border education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX and Features
The platform employs a modern AI-style branding with gradient backgrounds. It features a dual navigation system: horizontal top navigation for student/public pages (desktop) and bottom tab navigation (mobile), and a 3-column admin dashboard (desktop) with an icon-first sidebar. Navigation ensures full feature parity across desktop and mobile.

Key user experiences include an **Institution Portal** for managing courses, applications, and teams (with AI-powered content generation and DALL-E integration for images), and a **Student Experience** focused on intelligent course discovery, AI-assisted profile creation, and streamlined applications.

Core features include:
-   **Landing Page** with prominent search.
-   **Student Authentication Modal** with social and email/password logins.
-   Detailed **Public Course Detail Pages** and **Institution Pages**.
-   **Lead generation forms** and a comprehensive **Contact Us Page**.
-   **Super Admin Dashboard** for full CRUD operations.
-   **Public Listings** for institutions and courses with dynamic filtering.
-   Facebook-style **Notifications** and WhatsApp-style **Real-time Chat**.
-   **Student Document Management** with organized, color-coded folders and multi-format uploads.
-   **Enterprise CSV Bulk Import** for super admins/support managers to upload, validate, and approve large datasets.
-   **AI Data Extraction Features** (Super Admin only): Securely extracts institution and course data from website URLs using OpenAI GPT-4o, featuring stringent security measures, field-by-field approval, and comprehensive SSRF protection.
-   **Student Profile Management**: Comprehensive education history and language test score tracking with full CRUD, requiring 100% profile completion for application submission.
-   **Admin Profile Management**: Allows admins to update personal info and profile photos, with backend security enforcing role-based access and non-sensitive field restrictions.
-   **Student Dashboard Polish**: Comprehensive UI/UX improvements - max-w-7xl centered container, responsive spacing (space-y-6 md:space-y-8), fluid typography, mobile touch targets exceeding 44px standard (min-h-[60px] for cards, min-h-12 for buttons), responsive hero section, optimized quick actions, referral program, and application status with mobile-first stacked layouts.
-   **University Dashboard Polish**: Modern UI/UX matching student dashboard quality - max-w-7xl container, responsive spacing, fluid hero typography (text-3xl md:text-4xl lg:text-5xl), mobile-optimized stats grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4), large touch targets for quick actions (min-h-[80px] md:min-h-[120px]), mobile-first recent applications with stacked layout, all interactive elements min-h-[44px] for accessibility.
-   **Platform Admin Dashboard Polish** (Consultant, Support Manager, Content Manager): Mobile-first UI/UX improvements - max-w-7xl centered container with responsive padding (px-4 sm:px-6 lg:px-8), fluid typography scaling (text-2xl md:text-3xl lg:text-4xl for headers), responsive spacing patterns (space-y-6 md:space-y-8 for sections, gap-4 md:gap-6 for grids), mobile-responsive stats grids (grid-cols-1 sm:grid-cols-2/3 lg:grid-cols-4), horizontal scroll for tables (overflow-x-auto), 3-column layout (sidebar + main + right rail) that stacks on mobile, consistent touch targets (min-h-[44px]) across all tabs (Users, Institutions, Courses, Student Leads, Inquiry Leads, Applications, Data Import, Blogs).
-   **Course Pages**: Scholarship display as fixed value "Up to X%" for students, while institution pages show ranges. Career pathways section details roles and progression.
-   **Blog Infrastructure**: Markdown-based blog with admin management (create, edit, publish/draft, SEO fields) and public archive/post pages. Includes dynamic `/sitemap.xml` and `/robots.txt`.
-   **SEO Implementation (Courses & Institutions)**: Comprehensive SEO for all public course and institution pages, including dynamic meta tags, Open Graph/Twitter Cards, and JSON-LD Course/EducationalOrganization schemas.

### Technical Implementation
-   **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter (routing), TanStack Query (server state), React Hook Form, Zod.
-   **Backend**: Node.js Express.js in TypeScript.
-   **Authentication**: OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage.
-   **API**: RESTful, organized by user type.
-   **Real-time**: WebSockets for chat.
-   **AI Integration**: OpenAI API (GPT-4o) for content generation.
-   **Data Validation**: Shared Zod schemas for type-safe validation.
-   **Image Processing**: Multer and Sharp.
-   **Database**: PostgreSQL via Neon's serverless driver and Drizzle ORM. Schema supports sessions, users (universities, students, admins), university profiles (including `campusAddresses` JSONB and scholarship ranges), courses, applications, student profiles, and real-time chat. GIN indexes optimize JSONB/array filtering.
-   **Object Storage**: Replit Object Storage for images.
-   **Authorization**: Role-based access control (`userType`) with granular admin hierarchy enforced by backend middleware (`checkAdminAccess()`). A Central Login Portal at `/admin/login` redirects users post-authentication.

## External Dependencies

-   **Authentication Service**: Replit Auth (OIDC provider).
-   **AI Service**: OpenAI API (GPT-4o model).
-   **Database**: PostgreSQL (e.g., Neon).
-   **Object Storage**: Replit Object Storage.
-   **CDN**: Google Fonts CDN.
-   **Mapping/Location**: Google Places API.
-   **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
-   **Key NPM Packages**: Radix UI, Shadcn/ui, Lucide React, Tailwind CSS, react-hook-form, zod, @tanstack/react-query, drizzle-orm, openid-client, passport, express-session, bcrypt, Multer, Sharp, ws, @googlemaps/js-api-loader, papaparse, react-helmet, react-markdown, remark-gfm.