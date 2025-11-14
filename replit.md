# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered platform designed to streamline international education by connecting universities with prospective students. It offers intelligent course discovery, AI-assisted student profile creation, and comprehensive application/course management tools for institutions. The platform aims to improve global access to education and reduce administrative burdens for universities, tapping into the significant market potential of cross-border education.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX and Features

The platform features a modern AI-style branding with gradient backgrounds. It offers dual user experiences: an **Institution Portal** for managing courses, applications, and teams (including AI-powered content generation and image management with DALL-E integration for campus images), and a **Student Experience** focused on intelligent course discovery, AI-assisted profile creation, streamlined applications, favorites, and course comparison tools.

Key features include a clean **Landing Page** with prominent search, a tabbed **Student Authentication Modal** supporting social and email/password logins, and a detailed **Public Course Detail Page**. Lead generation forms capture unauthenticated user inquiries. A comprehensive **Contact Us Page** with category-based submissions is available.

For administration, a **Super Admin Dashboard** provides full CRUD operations. **Public Listings** display institutions and courses with dynamic filtering. A Facebook-style **Notifications** system provides real-time updates. A WhatsApp-style **Real-time Chat** facilitates direct messaging between users, with restricted initiation to prevent spam.

**Student Document Management** offers organized, color-coded folders with multi-format file uploads. An **Enterprise CSV Bulk Import** system allows super admins and support managers to upload, validate, and approve large datasets for universities and courses, including templates, per-row validation, and transactional execution. An **AI Institution Data Extraction** feature (super admin only) securely extracts institution data from website URLs using OpenAI GPT-4o, with stringent security measures like rate limiting, domain allowlisting, and SSRF protection.

### Technical Implementation

The **frontend** is built with React, TypeScript, Vite, Shadcn/ui (New York style), Radix UI, and Tailwind CSS, using Wouter for routing and TanStack Query for server state. Forms are managed with React Hook Form and Zod.

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