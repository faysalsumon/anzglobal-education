# ANZ Global Education Platform

## Overview

ANZ Global Education is an AI-powered educational platform that connects universities with prospective students worldwide. The platform enables universities to showcase their courses and manage applications while providing students with intelligent course discovery tools and AI-assisted profile creation. Built with a modern web stack, it features dual user experiences optimized for both institutional and student needs.

## Recent Changes (November 7, 2025)

### Real Institution Data - HILTON ACADEMY (Complete)
- **Schema Extension**: Added `numberOfCampuses`, `providerType`, `scholarshipPercentage`, and `topDisciplines` fields to universities table
- **HILTON ACADEMY Institution**: Added complete institution profile with real data from anzglobal.com.au
  - Provider Type: Institution
  - Location: Melbourne, Australia
  - Number of Campuses: 2
  - Current Scholarship: 20%
  - Top Disciplines: Hospitality Management, Commercial Cookery, Kitchen Management
  - Complete description and branding
- **Logo Integration**: Institution logo saved to attached_assets directory
- **UI Enhancement**: University profile form updated with Institution Details section for new fields
- **Ready for Courses**: Institution profile complete, ready to add courses in next step

### Public Course Discovery - No Login Required (Complete)
- **Unauthenticated Browse**: Users can explore all courses at `/courses` without logging in, matching the reference site workflow at anzglobal.com.au/courses
- **Search Integration**: Landing page autocomplete redirects to `/courses?search=...` instead of forcing login
- **Course Highlighting**: Selected courses from autocomplete are highlighted with visual feedback (ring-2 border, shadow, scale-105 transform) and smooth scroll
- **Smart Filters**: Public course page includes search, subject, level, and country filters working client-side
- **Login CTAs**: "Login & Apply" buttons throughout the page redirect to student login with course ID preserved for seamless application after authentication
- **Reference Match**: Implementation follows the user experience model of anzglobal.com.au/courses where browsing is public but applications require login

### Enhanced Course Search with Autocomplete (Complete)
- **Fixed Text Visibility**: Search bar text now displays in dark gray (text-gray-900) on white background for clear visibility
- **Google-Style Autocomplete**: Real-time course suggestions appear as you type, showing up to 5 matching courses
- **Smart Filtering**: Suggestions match against course titles, subjects, and descriptions
- **Improved UX**: Click outside to dismiss, Enter key to search, click suggestion to auto-fill
- **Visual Design**: Clean dropdown with course icon, title, subject, and university name for each suggestion
- **Workflow Update**: Autocomplete now redirects to public `/courses` page with search term and optional course highlight

### Student Referral System (Complete)
- **Database Schema**: Added `referralCode` field to `studentProfiles` table (varchar, unique, auto-generated 8-character codes) and created `referrals` table to track referral relationships with status tracking (pending/completed/cancelled) and bonus amounts
- **Automatic Code Generation**: All student profiles automatically receive a unique referral code upon creation; existing profiles were backfilled with codes
- **Referral Tracking**: New students can enter a referral code during profile creation, creating a referral record linking them to the referrer
- **API Endpoints**: Added `/api/student/referral/code`, `/api/student/referral/stats`, and `/api/student/referral/list` endpoints for retrieving referral information
- **Dashboard Integration**: Student dashboard displays referral section with shareable code and link (with copy-to-clipboard functionality), plus statistics showing total/pending/completed referrals and total bonus amount
- **Referral List Page**: Created `/student/referrals` page showing complete history of referred students with names, status badges, bonus amounts, and join dates
- **Query Parameter Support**: Landing page accepts `?ref=CODE` query parameter to pre-populate referral code in profile creation form

### Team Management System (Complete)
- **Role-Based Access Control**: Implemented comprehensive team management system allowing universities to add multiple team members with granular permissions (super_admin, admin, course_manager, application_manager)
- **Team Management Page**: Full-featured UI for super admins to view team members, add new members by email, update roles, and remove members
- **Backend Authorization**: All university endpoints now enforce role-based permissions through `checkUniversityAccess` middleware
- **End-to-End Testing**: Complete flow validated from adding members to updating roles to removing members
- **Navigation**: Team Management link added to university sidebar for easy access

### Improved Landing Page & User Type Selection
- **Separate Login CTAs**: Landing page now features distinct "I'm a Student" and "I'm a University" buttons that pass user type intent via query parameters (`/api/login?type=student` or `?type=university`)
- **Post-Authentication Flow**: New user type selection page displayed for authenticated users without a `userType`. Users explicitly choose their role (student or university) which is persisted via `POST /api/auth/set-user-type`
- **Enhanced UX**: Clear messaging ("Create account or login to get started") and visual distinction between student and university paths

### Application Submission Flow (Complete)
- **Course Detail Page**: Full course information display with university details, fees, duration, location, and comprehensive descriptions
- **Application Form**: Integrated application submission form for students with personal statement (minimum 50 characters) and additional info fields
- **End-to-End Flow**: Students can now browse courses → view details → submit applications → track application status
- **Data Integrity**: Backend properly joins course data with university information for complete course detail views

### Bug Fixes
- **SelectItem Empty Values**: Fixed Radix UI SelectItem components that were using empty strings as values, which caused runtime errors. All select dropdowns now use "all" as the default value instead of empty strings
- **Course Query Serialization**: Fixed queryKey object serialization issue where filter objects were being stringified as `[object Object]` in API requests. Course filtering is now handled client-side after fetching all active courses

### Test Data
- Created comprehensive test dataset with 5 universities (University, College, School, VET, TAFE), 10 diverse courses across multiple subjects and levels, and 3 student profiles for development and testing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component Library**: Shadcn/ui (New York style) built on Radix UI primitives with Tailwind CSS for styling. Components follow a consistent design system with HSL-based color tokens and custom CSS variables for theming.

**Routing**: Client-side routing via Wouter, a lightweight React router. Routes are split between authenticated university views (`/university/*`) and student views (`/student/*`), with a public landing page for unauthenticated users.

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Authentication state is managed through a dedicated `useAuth` hook that queries the user endpoint.

**Form Handling**: React Hook Form with Zod schema validation via `@hookform/resolvers`. Forms integrate with Shadcn/ui form components for consistent UX.

**Design System**: Custom Tailwind configuration with extended color palette, border radius scales, and CSS variables for theme support. Typography uses Inter for UI elements and Open Sans for body content (loaded via Google Fonts CDN).

### Backend Architecture

**Runtime**: Node.js with Express.js server framework using ES modules.

**Language**: TypeScript with strict type checking enabled.

**Authentication**: OpenID Connect (OIDC) integration with Replit Auth using Passport.js strategy. Sessions are stored in PostgreSQL via connect-pg-simple with 7-day session TTL. Middleware (`isAuthenticated`) protects authenticated routes.

**API Design**: RESTful API endpoints organized by user type:
- `/api/auth/*` - Authentication and user management
- `/api/university/*` - University-specific operations (profile, courses, applications, team management)
- `/api/university/team` - Team member management (list, add, update roles, remove members)
- `/api/student/*` - Student-specific operations (profile, applications, course browsing)
- `/api/courses` - Public course listing with filtering
- `/api/applications/*` - Application management

**Data Access Layer**: Storage abstraction (`IStorage` interface) implemented in `server/storage.ts` providing CRUD operations for all entities. This pattern allows for potential database provider swapping while maintaining consistent business logic.

**AI Integration**: OpenAI API integration via Replit's AI Integrations service using GPT-5 model. AI functions generate:
- University descriptions based on name and location
- Course descriptions based on title, subject, and level
- Student bios and career goal statements

**Schema Validation**: Shared Zod schemas between client and server via `shared/schema.ts` using drizzle-zod for type-safe validation of insert and update operations.

### Data Storage

**Database**: PostgreSQL accessed via Neon's serverless driver with WebSocket support.

**ORM**: Drizzle ORM with schema-first design. Database schema includes:
- `sessions` - Session storage for Replit Auth
- `users` - User accounts with `userType` field distinguishing universities from students
- `universities` - University profiles linked to user accounts
- `universityTeamMembers` - Team member records with role-based permissions (super_admin, admin, course_manager, application_manager)
- `courses` - Course offerings with rich metadata (fees, duration, location, etc.)
- `studentProfiles` - Student profile information including education level, career goals, and unique referral code
- `applications` - Application records linking students to courses with status tracking
- `referrals` - Referral tracking table linking referrers to referred students with status and bonus information

**Schema Management**: Drizzle Kit for migrations with configuration in `drizzle.config.ts`. Schema file uses relations to define entity connections for type-safe querying.

**Connection Pooling**: PostgreSQL connection pool managed by `@neondatabase/serverless`.

### Authentication & Authorization

**Identity Provider**: Replit's OIDC service as the authentication provider.

**Session Management**: Express-session with PostgreSQL storage, HTTP-only secure cookies, 7-day expiration.

**User Types**: Role-based access control using `userType` field on user records:
- `university` - Access to university dashboard, course management, application reviews
- `student` - Access to course browsing, profile management, application submissions

**Protected Routes**: Server-side middleware checks for authenticated sessions. Client-side routing conditionally renders university or student views based on user type.

**Token Management**: OAuth tokens (access and refresh) stored in user session with automatic expiration handling.

## External Dependencies

**Authentication Service**: Replit Auth (OIDC provider) for user authentication and authorization.

**AI Service**: Replit AI Integrations service providing OpenAI API access configured via environment variables (`AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`).

**Database**: PostgreSQL database (likely Neon) accessed via connection string in `DATABASE_URL` environment variable.

**CDN**: Google Fonts CDN for Inter, Open Sans, and other typography assets.

**NPM Packages**:
- UI: Radix UI primitives, Lucide React icons, class-variance-authority for component variants
- Forms: react-hook-form, @hookform/resolvers, zod
- Data: @tanstack/react-query, drizzle-orm, drizzle-zod
- Auth: openid-client, passport, express-session
- Build: Vite, esbuild for server bundling, TypeScript compiler

**Replit-Specific Integrations**:
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Code mapping for Replit IDE
- `@replit/vite-plugin-dev-banner` - Development environment banner