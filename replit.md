# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform connecting universities with prospective international students. It aims to streamline global education through intelligent course discovery, AI-assisted student profile creation, and comprehensive application/course management tools for educational institutions. The platform seeks to enhance access to education, reduce university administrative burdens, and capitalize on the growing cross-border education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX and Features
The platform adheres to the official ANZ Global Education brand identity, utilizing a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000, White/Light backgrounds) and typography (Nunito for headings, Open Sans for body text). Accessibility is a priority, with all color combinations meeting WCAG AA standards. The design features a dual navigation system (horizontal for public, bottom tab for mobile) and a 3-column admin dashboard with an icon-first sidebar. Full dark mode support is implemented.

Key features include:
-   **Institution Portal**: Manages courses, applications, and teams, incorporating AI-powered content generation and DALL-E integration.
-   **Student Experience**: Focuses on intelligent course discovery, AI-assisted profile creation, and streamlined applications.
-   **Landing Page** with prominent search.
-   **"Study in Australia" Page**: SEO-optimized landing page targeting international students with specific value propositions.
-   **Student Authentication Modal**: Supports social and email/password logins.
-   **Public Course Detail Pages** and **Institution Pages**.
-   **Lead Generation Forms** and a **Contact Us Page**.
-   **Super Admin Dashboard** for CRUD operations.
-   **Public Listings** for institutions and courses with dynamic filtering.
-   Facebook-style **Notifications** and WhatsApp-style **Real-time Chat**.
-   **Student Document Management**: Organized, color-coded folders with multi-format uploads.
-   **Enterprise CSV Bulk Import**: For super admins to upload, validate, and approve datasets.
-   **AI Data Extraction**: Securely extracts institution and course data from URLs using OpenAI GPT-4o, with stringent security and approval workflows.
-   **Student Profile Management**: Comprehensive education history and language test score tracking.
-   **Admin Profile Management**: Allows personal info and photo updates with role-based security.
-   **Dashboard Polish**: Consistent modern UI/UX across Student, University, and Platform Admin dashboards, prioritizing responsiveness, accessibility, and fluid typography.
-   **Profile Picture Display**: User avatars and full names in the navigation bar; admin roles displayed specifically.
-   **Course Pages**: Display scholarships and career pathways.
-   **Blog Infrastructure**: Markdown-based with admin management and dynamic SEO files.
-   **SEO Implementation**: Comprehensive dynamic meta tags, Open Graph/Twitter Cards, and JSON-LD schemas for public pages.
-   **Institution/Course Approval Workflow**: Requires platform admin approval for public visibility, with "pending" status for new registrations.
-   **Institution Registration & Authentication**: Streamlined onboarding via `InstitutionAuthModal` using Replit Auth OIDC, with planned migration to Google Firebase Authentication.
-   **Discipline-Based Course Filtering**: Comprehensive system with 15 main discipline categories (Accounting/Business/Finance, Agriculture/Forestry, Applied Sciences, Arts/Design/Architecture, Computer Science/IT, Education/Training, Engineering/Technology, Environmental Studies, Hospitality/Leisure/Sports, Humanities, Journalism/Media, Law, Medicine/Health, Short Courses, Trade Qualifications). Features interactive discipline cards on landing page, click-to-filter navigation, dropdown filter in course listings, integration with natural language search, and robust URL/state synchronization using snapshot-based pending hydration pattern to preserve filter selections across navigation, browser back/forward, and page loads.
-   **Sub-Discipline Categorization**: Hierarchical taxonomy system allowing courses to be classified into specific sub-categories within main disciplines. Features normalized database design with unique constraints, on-the-fly sub-discipline creation via autocomplete in course forms, usage count tracking for analytics, discipline-scoped filtering in public course listings with full URL synchronization, and AI-powered natural language search that extracts and filters by both discipline and sub-discipline parameters. Course form automatically resets sub-discipline when parent discipline changes to prevent invalid submissions.
-   **Course Level Filtering**: Interactive qualification level cards on landing page with 14 standardized levels (VCE, Certificate II-IV, Diploma, Advanced Diploma, Graduate Certificate/Diploma, Bachelor Degree, Professional Year, Masters/Doctoral/Higher Doctoral Degrees, ELICOS). Features clickable cards with course counts, direct navigation to filtered course listings, and database-level enum validation to ensure data integrity across all entry points including forms, CSV imports, and AI extraction.
-   **Promotional Video Section**: YouTube video embed showcasing ANZ Global Education's value proposition, positioned between discipline and course level sections on landing page.
-   **Footer with Social Media Icons**: Professional footer with social media links (Facebook, Instagram, LinkedIn, YouTube, Twitter) featuring circular icons with hover effects and accessibility support.
-   **Dynamic Animated Typing**: Natural language search features database-driven animated typing that displays actual course and institution recommendations from the system. Typing suggestions automatically update as courses/institutions are added, removed, or modified in the database. Course suggestions include disciplines, levels, and fee ranges. Institution suggestions include provider types (University, Institution, Tafe, School) and general search patterns. Provider types are enforced at the database level using PostgreSQL enums for data integrity.

### Technical Implementation
-   **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter (routing), TanStack Query, React Hook Form, Zod.
-   **Backend**: Node.js Express.js in TypeScript.
-   **Authentication**: OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage.
-   **API**: RESTful, organized by user type.
-   **Real-time**: WebSockets for chat.
-   **AI Integration**: OpenAI API (GPT-4o) for content generation.
-   **Data Validation**: Shared Zod schemas.
-   **Image Processing**: Multer and Sharp.
-   **Database**: PostgreSQL (Neon, Drizzle ORM) with GIN indexes for JSONB/array filtering.
-   **Object Storage**: Replit Object Storage for images.
-   **Authorization**: Role-based access control (`userType`) with granular admin hierarchy enforced by backend middleware.

### External Dependencies
-   **Authentication Service**: Replit Auth.
-   **AI Service**: OpenAI API (GPT-4o model).
-   **Database**: PostgreSQL (Neon).
-   **Object Storage**: Replit Object Storage.
-   **CDN**: Google Fonts CDN.
-   **Mapping/Location**: Google Places API.
-   **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
-   **Email Service**: Resend API.
```