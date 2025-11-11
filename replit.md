# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered educational platform connecting universities with prospective students globally. It streamlines the international education application process by offering intelligent course discovery, AI-assisted profile creation for students, and comprehensive course and application management tools for universities. The platform aims to enhance global access to education and reduce administrative overhead for institutions, unlocking significant market potential in cross-border education.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

Built with React and TypeScript using Vite, featuring Shadcn/ui (New York style) based on Radix UI and Tailwind CSS for a consistent HSL-based design system. Wouter handles client-side routing, separating authenticated university and student views from public access. TanStack Query manages server data, with `useAuth` for authentication. Forms use React Hook Form and Zod for validation.

### Backend

Node.js Express.js server in TypeScript. Authentication uses OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage. The API is RESTful, organized by user type, including endpoints for authentication, university management, student operations, public course listings, and super admin functionalities. Real-time chat uses WebSockets for message delivery and REST for conversation management. AI integration uses the OpenAI API (GPT-4o) for content generation. Shared Zod schemas ensure type-safe validation. Image processing uses Multer and Sharp. Secure, session-based WebSocket authentication is implemented, and chat access is restricted: only universities and platform admins can initiate conversations, and universities can only message students who have applied to their institution.

### Data Storage

PostgreSQL, accessed via Neon's serverless driver, is the primary database, utilizing Drizzle ORM for schema-first design and migrations. The schema includes tables for sessions, users (universities, students, admins), university profiles, team members with role-based permissions, courses (with extensive fields including `englishRequirementsStructured` JSONB), course recommendations (caching AI-powered matches), student profiles, applications, referral tracking, student leads (for inquiry management), contact submissions, favorites, course comparisons, notifications (Facebook-style), conversations, and messages. GIN indexes optimize filtering on array and JSONB fields. Replit Object Storage is used for images.

### Authentication & Authorization

Replit's OIDC service is the authentication provider. Express-session manages sessions with PostgreSQL storage. Role-based access control uses a `userType` field (`university`, `student`, `admin`) with a granular admin role hierarchy: `super_admin`, `support_manager`, and `support_staff` (consultant) with varying access levels. Security is enforced via backend middleware (`checkAdminAccess()`) and frontend conditional rendering/query gating. Admin authentication includes OIDC and email/password login with bcrypt.

### UI/UX and Features

The platform features modern AI-style branding with gradient backgrounds and contemporary visual effects. It offers dual user experiences:
- **Institution Portal**: Comprehensive dashboard for course, application, and team management, including AI-powered content generation.
- **Student Experience**: Intelligent course discovery with advanced filtering, AI-assisted profile creation, streamlined application process, favorites functionality, and side-by-side course comparison tools (up to 4 courses).

**Landing Page**: Clean, clutter-free header with only Student authentication button. Search functionality in hero section allows course and institution discovery. Footer contains navigation links including Browse Courses, Browse Institutions, and Contact Us.

Key features include:
- **Student Authentication Modal**: Modern tabbed interface with Login and Sign Up options. Both tabs feature social login buttons (Google, Facebook, Apple) and email/password forms. Sign Up includes First Name, Last Name, Email, Password, and Confirm Password fields. UI-only implementation ready for backend authentication integration.
- **Public Course Detail Page**: Modernized with AI aesthetics, detailed information, and sticky CTA elements.
- **Lead Generation**: "Request More Information" forms on course listings and detail pages for unauthenticated users, triggering admin/consultant notifications.
- **Contact Us Page**: Public-facing contact form at `/contact` with gradient hero, glassmorphism design, and responsive layout. Features category-based inquiry submission (General Inquiry, Technical Support, Course Information, Partnership Opportunities, Other), React Hook Form + Zod validation, accessible success messaging with aria-live regions, contact information sidebar (email, phone, address), and office hours display. Accessible via footer menu. Backend provides public submission endpoint and admin management endpoints restricted to super_admin, support_manager, and support_staff roles.
- **Super Admin Dashboard**: Full CRUD operations for users, institutions, and courses.
- **Public Listings**: Detailed institution and course listings with dynamic filtering and search.
- **Notifications**: Facebook-style system with real-time updates for all user types, unread badges, and polling.
- **Real-time Chat**: WhatsApp-style interface for direct messaging between users (universities, students, admins) with conversation lists, message threads, typing indicators, and read statuses. Integrated into sidebars with unread message counters. Chat initiation is restricted to prevent spam.
- **Student Document Management**: Comprehensive document organization system with default folders (Academic, Financial, Personal) automatically created on student signup. Features include:
  - **Folder Organization**: Color-coded folders with document counts, default and custom folder support
  - **Document Upload**: Multi-format file upload (PDF, DOC, DOCX, images) with 10MB limit, stored in object storage or local uploads directory with automatic fallback
  - **Document Types**: Categorized uploads (Academic Transcript, Passport, Financial Statement, etc.) with optional descriptions
  - **Grid/List Views**: Switchable document display modes for optimal viewing
  - **Persistence**: All folders and documents persist across sessions with no duplicates on re-login
  - **Access Control**: Folder and document ownership validated via userId (FK to users table)

UI components ensure a smooth experience with responsive data tables, form validation, and toast notifications.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider).

**AI Service**: OpenAI API (GPT-4o model).

**Database**: PostgreSQL (e.g., Neon).

**Object Storage**: Replit Object Storage.

**CDN**: Google Fonts CDN.

**Google Maps API**: Google Places API for address autocomplete.

**NPM Packages**:
- **UI**: Radix UI, Shadcn/ui, Lucide React, class-variance-authority, Tailwind CSS
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data**: @tanstack/react-query, drizzle-orm, drizzle-zod
- **Auth**: openid-client, passport, express-session, bcrypt
- **Image Processing**: Multer, Sharp
- **Real-time**: ws (WebSocket), cookie, cookie-signature
- **Google Maps**: @googlemaps/js-api-loader

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`