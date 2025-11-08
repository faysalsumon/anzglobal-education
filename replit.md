# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered educational platform designed to connect universities with prospective students globally. It enables universities to showcase courses and manage applications, while providing students with intelligent course discovery tools and AI-assisted profile creation. The platform offers dual user experiences optimized for both institutional and student needs, aiming to streamline the international education application process. The business vision is to streamline the international education application process, enhance global access to education, and significantly reduce administrative overhead for institutions, unlocking substantial market potential in cross-border education.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, utilizing Vite for development. It uses Shadcn/ui (New York style) based on Radix UI and Tailwind CSS for a consistent HSL-based design system. Wouter handles client-side routing, separating authenticated university (`/university/*`) and student (`/student/*`) views from public access. State management for server data is handled by TanStack Query, with a `useAuth` hook for authentication. Forms are managed with React Hook Form and Zod for validation, integrated with Shadcn/ui components.

### Backend Architecture

The backend is a Node.js Express.js server written in TypeScript. Authentication uses OpenID Connect (OIDC) via Replit Auth and Passport.js, with sessions stored in PostgreSQL. The API is RESTful, organized by user type, including endpoints for authentication, university management (profile, courses, applications, team), student operations (profile, applications), public course listings, and super admin functionalities for comprehensive CRUD operations on users, institutions, and courses. A data access layer (`IStorage` interface) abstracts database operations. AI integration uses the OpenAI API via Replit's AI Integrations service (GPT-5) for generating university and course descriptions, and student bios. Shared Zod schemas (`shared/schema.ts`) ensure type-safe validation across client and server. Image processing for uploads and AI-generated content utilizes Multer and Sharp.

### Data Storage

PostgreSQL, accessed via Neon's serverless driver, is the primary database. Drizzle ORM is used for schema-first design and interactions, with Drizzle Kit managing migrations. The schema includes tables for sessions, users (distinguishing universities from students and admins), university profiles (with extended fields like `smallDescription`, `fullDescription`, `institutionGallery`, `topCourses`), team members with role-based permissions, courses (with comprehensive fields including `courseCode`, `durationWeeks`, `intakes`, `studyAreas`, `careerOutcomes`, `pathways`, `prPathway`, `scholarshipPercentage`, `minimumAge`, `academicRequirements`, `englishRequirements`, `englishRequirementsStructured` (JSONB with IELTS/TOEFL/PTE/Duolingo scores), `deliveryMode`, `campusLocations`, `workRights`, `internshipAvailable`, `internshipDetails`, `curriculumUrl`, `costOfLiving`, `applicationFees`, `images`), course_recommendations (caching AI-powered matches with `matchScore`, `rationale`, `matchFactors` JSONB, eligibility flags, and cache freshness tracking), student profiles, applications, referral tracking, favorites (with `itemType` enum for 'university' or 'course', composite unique constraint on userId/itemType/itemId, and proper foreign key relations), course comparisons (enabling students to compare up to 4 courses side-by-side with a unique index on studentProfileId/courseId), and notifications (Facebook-style notification system with fields: id, userId, type, title, message, link, metadata JSONB, isRead, createdAt; indexed on userId, isRead, and createdAt for efficient querying and polling). GIN indexes on array and JSONB fields (intakes, studyAreas, careerOutcomes, pathways, englishRequirementsStructured) optimize filtering for AI-powered recommendations. Replit Object Storage is configured for institution and course images.

### Authentication & Authorization

Replit's OIDC service is the authentication provider. Express-session manages sessions with PostgreSQL storage and secure, HTTP-only cookies. Role-based access control is implemented using a `userType` field (`university`, `student`, `admin`) with granular admin roles stored in the `admin_team_members` table. 

**Admin Role Hierarchy:**
- **super_admin**: Full platform access, can manage all resources and team members
- **support_manager**: Full administrative access (same as super_admin), can manage users, institutions, courses, applications, and student leads
- **support_staff** (consultant): Limited read-only access to courses, student leads, and applications; cannot access users or institutions; cannot create/edit/delete any resources

**Security Implementation:**
- Backend: `checkAdminAccess()` function enforces role-based permissions on all super-admin routes with explicit role allowlists
- Frontend: `hasFullAdminAccess` flag conditionally renders tabs, action buttons, and enables/disables queries based on role
- Mutating operations (POST/PATCH/DELETE): Restricted to super_admin and support_manager only
- Read operations: Users/Institutions restricted to full admins; Courses/Leads/Applications accessible to all admin roles
- Query gating: Frontend prevents unauthorized API calls by conditionally enabling queries based on role

Server-side middleware enforces authenticated sessions and manages OAuth tokens. Admin authentication includes both OIDC (Replit Auth) and email/password login with bcrypt hashing for secure access.

### UI/UX and Features

The platform provides dual user experiences. For institutions, a comprehensive dashboard enables course, application, and team management, including AI-powered content generation for descriptions and image galleries. For students, intelligent course discovery with advanced filtering, AI-assisted profile creation, a streamlined application process, favorites functionality, and course comparison tools are key features. Students can save institutions and courses to their dashboard for easy access, with heart icon toggles on public pages and a dedicated Favorites tab in their profile. The course comparison feature allows students to select up to 4 courses from the public courses page via checkbox selection, view their selections in a sticky comparison bar, and navigate to a dedicated side-by-side comparison page displaying detailed course information for informed decision-making. Unauthenticated users are prompted to log in when attempting to favorite or compare courses. A Super Admin dashboard offers full CRUD operations for users, institutions, and courses. Public-facing pages include detailed listings for institutions and courses with dynamic filtering, search capabilities, and rich content displays. A Facebook-style notification system provides real-time updates for all user types: universities receive notifications for new applications, students are notified of application status changes, and team members are alerted when added to institutions. The notification bell component, integrated into the app header, displays an unread count badge, offers a dropdown with all notifications, supports click-to-mark-as-read and click-to-dismiss functionality, and polls every 30 seconds for new notifications. Key UI components like responsive data tables, form validation, and toast notifications ensure a smooth user experience.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider).

**AI Service**: Replit AI Integrations service (OpenAI API, GPT-5 model).

**Database**: PostgreSQL (e.g., Neon).

**Object Storage**: Replit Object Storage.

**CDN**: Google Fonts CDN for typography.

**NPM Packages**:
- **UI**: Radix UI, Shadcn/ui, Lucide React, class-variance-authority, Tailwind CSS
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data**: @tanstack/react-query, drizzle-orm, drizzle-zod
- **Auth**: openid-client, passport, express-session, bcrypt
- **Image Processing**: Multer, Sharp
- **Build**: Vite, esbuild

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`