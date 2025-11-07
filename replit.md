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

PostgreSQL, accessed via Neon's serverless driver, is the primary database. Drizzle ORM is used for schema-first design and interactions, with Drizzle Kit managing migrations. The schema includes tables for sessions, users (distinguishing universities from students and admins), university profiles (with extended fields like `smallDescription`, `fullDescription`, `institutionGallery`, `topCourses`), team members with role-based permissions, courses (with detailed fields like `courseCode`, `prPathway`, `scholarshipPercentage`, `eligibilityRequirements`, `englishRequirements`, `curriculumUrl`, `costOfLiving`, `applicationFees`, `images`), student profiles, applications, referral tracking, and favorites (with `itemType` enum for 'university' or 'course', composite unique constraint on userId/itemType/itemId, and proper foreign key relations). Replit Object Storage is configured for institution and course images.

### Authentication & Authorization

Replit's OIDC service is the authentication provider. Express-session manages sessions with PostgreSQL storage and secure, HTTP-only cookies. Role-based access control is implemented using a `userType` field (`university`, `student`, `admin`) and `role` field (e.g., `super_admin`) to protect routes and dictate access to dashboards and features. Server-side middleware enforces authenticated sessions and manages OAuth tokens. Admin authentication includes email/password login with bcrypt hashing for secure access.

### UI/UX and Features

The platform provides dual user experiences. For institutions, a comprehensive dashboard enables course, application, and team management, including AI-powered content generation for descriptions and image galleries. For students, intelligent course discovery with advanced filtering, AI-assisted profile creation, a streamlined application process, and favorites functionality are key features. Students can save institutions and courses to their dashboard for easy access, with heart icon toggles on public pages and a dedicated Favorites tab in their profile. Unauthenticated users are prompted to log in when attempting to favorite items. A Super Admin dashboard offers full CRUD operations for users, institutions, and courses. Public-facing pages include detailed listings for institutions and courses with dynamic filtering, search capabilities, and rich content displays. Key UI components like responsive data tables, form validation, and toast notifications ensure a smooth user experience.

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