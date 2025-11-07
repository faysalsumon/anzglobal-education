# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered educational platform designed to connect universities with prospective students globally. It enables universities to showcase courses and manage applications, while providing students with intelligent course discovery tools and AI-assisted profile creation. The platform offers dual user experiences optimized for both institutional and student needs, aiming to streamline the international education application process.

## Recent Changes (November 07, 2025)

### Public Course Detail Page
- Created comprehensive public course detail page at `/courses/:id`
- Extended course schema with detailed fields:
  - `courseCode`: Course registration code
  - `prPathway`: Boolean flag for PR pathway courses
  - `scholarshipPercentage`: Institution scholarship percentage
  - `eligibilityRequirements`: Course eligibility criteria
  - `englishRequirements`: IELTS/PTE requirements
  - `curriculumUrl`: Link to download course curriculum
  - `costOfLiving`: Estimated annual cost of living
  - `applicationFees`: Application fees amount
  - `images`: Array of course images
- Course detail page displays:
  - Hero section with course title, badges (scholarship, PR pathway), course code, and university logo
  - Tab navigation with smooth scroll-to-section functionality:
    - INFO: Scrolls to top (About Course section)
    - FEES: Scrolls to Course Fees section
    - ELIGIBILITY: Scrolls to Course Eligibility section
  - Course description and complete details
  - Sidebar with quick facts (duration, fees, location, intake, discipline)
  - Course fees breakdown table (tuition, cost of living, application fees)
  - Eligibility and English requirements sections
  - "Download Curriculum" and "Login to Apply" action buttons
  - Redesigned "Offered By" institution card with enhanced UI:
    - Distinctive header with primary-colored accent bar
    - Highlighted border (`border-2 border-primary/20`)
    - Institution logo in bordered white box alongside name
    - Detailed institution information (provider type, established year, campuses, scholarship)
    - Primary-styled "View Full Institution Profile" button with Globe icon
    - Clean key-value layout with proper spacing
- Updated "View Course" button in public courses listing to link to public course detail page
- Fixed sticky positioning on sidebar to only apply on large screens (prevented button overlap on mobile)

### Public Institutions Listing Page Updates
- **Replaced "Visit Website" button** with two action buttons on each institution card:
  - "View Institution" - navigates to institution detail page
  - "View Courses" - navigates to courses filtered by that institution
- Created comprehensive institutions listing page at `/institutions` with advanced filtering
- Implemented dynamic filters based on actual data:
  - Location filter (all available locations)
  - Provider type filter (all available provider types)
  - Scholarship percentage filter (dynamically generated from actual percentages)
- Added URL search parameter support for seamless search redirection from home page
- Institution cards display: logo, name, location, top disciplines, campus count, scholarship percentage

### Institution Detail Page
- Created new public institution detail page at `/institutions/:id`
- Displays complete institution information including:
  - Institution logo, name, location, and description
  - Provider type and scholarship badges
  - Top disciplines offered
  - Institution details (established year, number of campuses)
  - Contact information (email, phone, website)
  - "View All Courses" button linking to filtered courses
  - "Back to Institutions" navigation
- Added `/api/institutions/:id` API endpoint for fetching single institution

### Enhanced Courses Page
- Added university filter support via URL parameter `?university={id}`
- Courses automatically filtered when arriving from institution pages
- University filter preserved in URL for visibility and sharing

### Enhanced Landing Page Search
- Added toggle between "Courses" and "Institutions" search types
- Implemented autocomplete suggestions for both courses and institutions
- Search redirects to appropriate page with search query in URL:
  - Courses: `/courses?search=query`
  - Institutions: `/institutions?search=query`
- Search query is automatically populated from URL parameters on destination pages

### API Enhancements
- Added `/api/institutions` endpoint to fetch all universities with complete data
- Added `/api/institutions/:id` endpoint to fetch single institution by ID
- Added `getAllUniversities()` method to storage interface
- All institution extended fields now accessible: providerType, numberOfCampuses, scholarshipPercentage, topDisciplines

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