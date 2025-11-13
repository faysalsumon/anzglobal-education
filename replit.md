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

PostgreSQL, accessed via Neon's serverless driver, is the primary database, utilizing Drizzle ORM for schema-first design and migrations. The schema includes tables for sessions, users (universities, students, admins), university profiles (with `country` text field and `campusAddresses` JSONB field for comprehensive multi-campus location data, plus `scholarshipPercentageMin`/`scholarshipPercentageMax` integer fields for scholarship ranges), team members with role-based permissions, courses (with extensive fields including `englishRequirementsStructured` JSONB and `scholarshipPercentageMin`/`scholarshipPercentageMax` for scholarship ranges), course recommendations (caching AI-powered matches), student profiles, applications, referral tracking, student leads (for inquiry management), contact submissions, favorites, course comparisons, notifications (Facebook-style), conversations, messages, document folders, documents, and import_batches (CSV bulk import staging). Enum types enforce status/type fields (e.g., import_status, import_type). GIN indexes optimize filtering on array and JSONB fields. Replit Object Storage is used for images. Note: The redundant `location` field was removed from universities table as `campusAddresses` provides more comprehensive location data.

### Authentication & Authorization

Replit's OIDC service is the authentication provider. Express-session manages sessions with PostgreSQL storage. Role-based access control uses a `userType` field (`university`, `student`, `admin`) with a granular admin role hierarchy: `super_admin`, `support_manager`, `support_staff` (consultant), and `operations_staff` with varying access levels. Security is enforced via backend middleware (`checkAdminAccess()`) which supports dual-source role checking: direct role in users table (for test/migrated admins) or admin_team_members table (for team-managed admins). OIDC callback preserves existing admin/university user roles even when login intent is 'student'. Frontend uses conditional rendering and query gating. Admin authentication includes OIDC and email/password login with bcrypt.

**Central Login Portal**: A dedicated `/admin/login` page provides unified authentication for all user types (admin, university, student) with intelligent role-based redirection. After successful login, users are automatically routed to their appropriate dashboard: admins to `/admin/dashboard`, universities to `/university/profile`, and students to `/student/courses`. The page supports both email/password authentication and Replit Auth (OIDC), using `queryClient.fetchQuery` for race-condition-free user data retrieval and smart redirect logic. The login flow ensures proper session management and cache invalidation.

### UI/UX and Features

The platform features modern AI-style branding with gradient backgrounds and contemporary visual effects. It offers dual user experiences:
- **Institution Portal**: Comprehensive dashboard for course, application, and team management, including AI-powered content generation. Institution profile form includes 12 required fields:
  1. **Logo Upload**: 160x160px image with circular border (#F0F0F0 1px), stored in object storage
  2. **Institute Name**: Required text field
  3. **Website**: URL field with validation
  4. **Country**: Text field for primary country (AI generation uses this field)
  5. **Institute Type**: Dropdown with 5 options (Institution, TAFE, University, College, School)
  6. **Institution Gallery**: Dual-mode image management - institutions can upload photos OR generate professional campus images using OpenAI DALL-E with text prompts. Supports up to 6 images, automatically resized to 600x400px. Features:
     - **File Upload**: Multi-image upload with automatic resizing and validation
     - **AI Generation**: Custom prompt-based image generation using DALL-E
     - **Reusable Component**: `GalleryManager` component provides unified interface for both upload modes
     - **Backend Endpoints**: `POST /api/university/upload-gallery-image` (multipart upload) and `POST /api/university/generate-gallery-image` (AI generation with prompt)
     - **Storage**: Images stored in `/public/institutions/` directory with unique filenames
  7. **Top Disciplines**: Comma-separated list of academic strengths
  8. **Top Courses**: Featured course offerings
  9. **Scholarship**: Yes/No toggle with conditional range inputs (Min % and Max % from 0-100%). Supports 0% scholarships and validates that min ≤ max
  10. **Number of Campuses**: Numeric field controlling dynamic campus address inputs
  11-12. **Campus Addresses**: Dynamic JSONB array with 5 fields per campus (address, city, state, postcode, country), automatically resizing based on numberOfCampuses. Features Google Places API autocomplete on street address field for intelligent address entry with automatic field population
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
- **CSV Bulk Import**: Enterprise-grade data migration system for institutions transitioning from existing platforms (e.g., WordPress). Super admin and support manager roles can upload, validate, and approve CSV imports with:
  - **Two Entry Points**: Accessible as standalone page (`/admin/csv-import`) and integrated "Data Import" tab in Admin Dashboard (`/admin/dashboard#data-import`)
  - **Reusable Component**: `AdminCsvImportPanel` component enables code reuse across both entry points with shared query keys for cache consistency
  - **Two-Phase Workflow**: Upload/parse CSV into staging table → preview with validation → approve to execute in transaction
  - **Template Download**: Pre-configured CSV templates with all required fields and example data for universities and courses, including new provider types (Institution, TAFE, University, College, School), campus addresses (JSON-formatted), and scholarship ranges (scholarshipPercentageMin, scholarshipPercentageMax)
  - **Validation Engine**: Per-row validation with error tracking, duplicate detection, foreign key validation (courses link to universities by name), and scholarship range validation (min ≤ max, both 0-100%, handles 0% values correctly)
  - **Security**: CSV-only file filter, 2MB size limit, role-based access (super_admin/support_manager), sanitized JSON storage
  - **Database Schema**: `import_batches` table tracks all imports with status (pending/approved/rejected), validation results, and metadata
  - **Transactional Import**: Approval executes full batch in database transaction with per-row error capture and rollback on failure
  - **Campus Address Support**: CSV templates include campusAddresses field as JSON string (e.g., `[{"address":"...","city":"...","state":"...","postcode":"...","country":"..."}]`), parser safely handles malformed JSON with console warnings
  - **Import History**: List view shows all past imports with status, counts, timestamps, and ability to download original files
  - **Hash Navigation**: Admin Dashboard uses lazy-initialized hash navigation with access control guards, query parameter preservation, and no history pollution (uses replaceState)

UI components ensure a smooth experience with responsive data tables, form validation, and toast notifications.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider).

**AI Service**: OpenAI API (GPT-4o model).

**Database**: PostgreSQL (e.g., Neon).

**Object Storage**: Replit Object Storage.

**CDN**: Google Fonts CDN.

**Google Maps API**: Google Places API for address autocomplete. Used in university campus addresses (`GoogleAddressAutocomplete` component) to search for full street addresses and auto-populate all address fields (street, city, state, postcode, country). Also used in `GooglePlacesAutocomplete` component for city-only search.

**NPM Packages**:
- **UI**: Radix UI, Shadcn/ui, Lucide React, class-variance-authority, Tailwind CSS
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data**: @tanstack/react-query, drizzle-orm, drizzle-zod
- **Auth**: openid-client, passport, express-session, bcrypt
- **Image Processing**: Multer, Sharp
- **Real-time**: ws (WebSocket), cookie, cookie-signature
- **Google Maps**: @googlemaps/js-api-loader
- **CSV Processing**: papaparse (for bulk data import)

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`