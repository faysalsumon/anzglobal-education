# ANZ Global Education Platform

## Overview
ANZ Global Education is an AI-powered platform designed to connect international students with universities globally. Its primary purpose is to simplify course discovery, facilitate student profile creation, and provide comprehensive application and course management tools for educational institutions. The platform aims to improve access to education, reduce administrative burdens for universities, and tap into the expanding international education market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX and Features
The platform adheres to ANZ Global Education's brand identity, using a specific color palette (Primary Blue #3465A5, Secondary Dark Gray #333333, Accent Orange #FF5000) and typography (Nunito, Open Sans). Accessibility meeting WCAG AA standards is a priority. It features a dual navigation system and a 3-column admin dashboard with dark mode support.

Key features include:
-   **Institution Portal**: Manages courses, applications, and teams, with AI-powered content generation and DALL-E integration.
-   **Student Experience**: Intelligent course discovery, AI-assisted profile creation, and streamlined applications.
-   **Public Pages**: Landing page, "Study in Australia" page, course detail pages, institution pages, lead generation forms, and contact page.
-   **Authentication**: Student authentication modal with social login options, supporting Replit Auth and planned Firebase integration.
-   **Dashboards**: Super Admin dashboard for CRUD, and consistent modern UI/UX across Student, University, and Platform Admin dashboards with responsiveness and accessibility.
-   **Communication**: Facebook-style notifications and WhatsApp-style real-time chat.
-   **Document & Data Management**: Student document management, enterprise CSV bulk import, and AI data extraction from URLs using OpenAI GPT-4o.
-   **Profile Management**: Student and Admin profile management with role-based security.
-   **Content & SEO**: Course pages displaying scholarships/career pathways, markdown-based blog infrastructure, and comprehensive dynamic SEO for public pages.
-   **Workflows**: Institution/Course approval workflow by platform admin.
-   **Filtering & Search**: Discipline-based course filtering with 15 categories and sub-disciplines, course level filtering with 14 standardized levels, dynamic animated typing for natural language search, and location-based course filtering with interactive campus badges on cards.
-   **Maps & Location**: Google Maps integration for campus locations with custom markers, and normalized campus data for precise location-based course search.
-   **AI Chat Agent**: RAG-powered AI assistant with a compact, Replit-style animated icon (ribbons/bookmarks with diagonal pencil). Positioned at bottom-20 right-3 (mobile) and bottom-24 right-4 (desktop) to prevent header overlap. Button sizes: 48px mobile, 56px desktop. Chat window: max-w-[340px] mobile, max-w-[360px] desktop, height min(480px, calc(100vh - 180px)). Compact header with small avatar (28px) and reduced text sizes. Uses Pinecone vector database for platform-specific knowledge and OpenAI GPT-4o-mini. Includes event-driven auto-updates for knowledge base, close/minimize buttons, and supports both authenticated and anonymous users.

### Technical Implementation
-   **Frontend**: React, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, Wouter, TanStack Query, React Hook Form, Zod.
-   **Backend**: Node.js Express.js in TypeScript.
-   **Authentication**: OpenID Connect (OIDC) via Replit Auth and Passport.js, with PostgreSQL session storage.
-   **API**: RESTful, organized by user type.
-   **Real-time**: WebSockets for chat.
-   **AI Integration**: OpenAI API (GPT-4o).
-   **Database**: PostgreSQL (Neon, Drizzle ORM) with GIN indexes.
-   **Object Storage**: Replit Object Storage.
-   **Authorization**: Role-based access control (`userType`) enforced by backend middleware.

## External Dependencies
-   **Authentication Service**: Replit Auth.
-   **AI Service**: OpenAI API (GPT-4o model).
-   **Vector Database**: Pinecone.
-   **Database**: PostgreSQL (Neon).
-   **Object Storage**: Replit Object Storage.
-   **CDN**: Google Fonts CDN.
-   **Mapping/Location**: Google Maps JavaScript API, Google Places API.
-   **Replit-Specific Integrations**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`.
-   **Email Service**: Resend API.