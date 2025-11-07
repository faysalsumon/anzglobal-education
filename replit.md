# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered educational platform designed to connect universities with prospective students globally. It enables universities to showcase courses and manage applications, while providing students with intelligent course discovery tools and AI-assisted profile creation. The platform offers dual user experiences optimized for both institutional and student needs, aiming to streamline the international education application process.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for development and bundling. It leverages Shadcn/ui (New York style) based on Radix UI and Tailwind CSS for a consistent design system with HSL-based color tokens. Wouter handles client-side routing, separating authenticated university (`/university/*`) and student (`/student/*`) views from public access. State management is handled by TanStack Query for server state, with a dedicated `useAuth` hook for authentication. Form handling uses React Hook Form with Zod for validation, integrated with Shadcn/ui components.

### Backend Architecture

The backend is a Node.js Express.js server written in TypeScript. Authentication uses OpenID Connect (OIDC) via Replit Auth and Passport.js, with sessions stored in PostgreSQL. The API is RESTful, organized by user type, including endpoints for authentication, university management (profile, courses, applications, team), student operations (profile, applications), and public course listings. A data access layer (`IStorage` interface) abstracts database operations. AI integration uses the OpenAI API via Replit's AI Integrations service (GPT-5) for generating university, course descriptions, and student bios. Shared Zod schemas (`shared/schema.ts`) ensure type-safe validation across client and server.

### Data Storage

PostgreSQL, accessed via Neon's serverless driver, is the primary database. Drizzle ORM is used for schema-first design and interactions, with Drizzle Kit managing migrations. The schema includes tables for sessions, users (distinguishing universities from students), university profiles, team members with role-based permissions, courses, student profiles (including referral codes), applications, and referral tracking.

### Authentication & Authorization

Replit's OIDC service is the authentication provider. Express-session manages sessions with PostgreSQL storage and secure, HTTP-only cookies. Role-based access control is implemented using a `userType` field (`university` or `student`) to protect routes and dictate access to dashboards and features. Server-side middleware enforces authenticated sessions, and OAuth tokens are managed within the user session.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider).

**AI Service**: Replit AI Integrations service (OpenAI API, GPT-5 model).

**Database**: PostgreSQL (e.g., Neon) via `DATABASE_URL`.

**CDN**: Google Fonts CDN for typography.

**NPM Packages**:
- UI: Radix UI, Lucide React, class-variance-authority
- Forms: react-hook-form, @hookform/resolvers, zod
- Data: @tanstack/react-query, drizzle-orm, drizzle-zod
- Auth: openid-client, passport, express-session
- Build: Vite, esbuild

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`