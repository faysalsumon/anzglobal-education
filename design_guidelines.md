# AI-Powered Educational Platform Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Coursera and edX's proven educational interfaces, optimized for course discovery and learning management with professional credibility.

## Core Design Principles
1. **Educational Clarity**: Clean, distraction-free interfaces that prioritize content and usability
2. **Trust & Credibility**: Professional presentation suitable for academic institutions
3. **Efficient Discovery**: Streamlined navigation and powerful filtering for quick course finding
4. **Dual-User Experience**: Distinct but cohesive experiences for universities and students

---

## Typography System
**Font Families**: Inter for UI elements, Open Sans for body content (via Google Fonts CDN)

**Hierarchy**:
- Hero Headlines: Inter Bold, text-5xl to text-6xl
- Page Titles: Inter Semibold, text-4xl
- Section Headers: Inter Semibold, text-3xl
- Card Titles: Inter Medium, text-xl
- Body Text: Open Sans Regular, text-base
- Captions/Meta: Open Sans Regular, text-sm
- Labels: Inter Medium, text-sm uppercase tracking-wide

---

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, and 16 for consistent rhythm
- Component padding: p-6 or p-8
- Section spacing: py-12 (mobile) to py-20 (desktop)
- Card gaps: gap-6 or gap-8
- Form field spacing: space-y-4

**Container Strategy**:
- Full-width sections with inner max-w-7xl mx-auto px-4
- Content sections: max-w-6xl
- Form containers: max-w-2xl
- Text content: max-w-prose

---

## Page Layouts

### Landing Page (Public)
1. **Hero Section** (80vh): Large hero image showing diverse students/university campus with ANZ Global Education logo, headline "Connect Universities and Students with AI-Powered Course Discovery", search bar with location/subject quick filters, and primary CTA buttons with blur backdrop
2. **Value Proposition** (3-column grid): For Universities, For Students, AI-Powered features with icons and descriptions
3. **Featured Courses** (4-column grid on desktop, carousel on mobile): Course cards with university branding
4. **How It Works** (stepped process): 3-step visual guide for both user types
5. **Statistics Section** (4-column): Universities registered, courses available, students enrolled, success rate
6. **CTA Section**: Split layout with dual registration paths

### University Dashboard
**Sidebar Navigation** (fixed left, 280px): Logo at top, main nav items (Dashboard, Courses, Applications, Profile, AI Assistant), user menu at bottom

**Main Content Area**:
- Dashboard: Stats cards (4-column grid), recent applications table, quick actions
- Course Management: Data table with inline actions, "Create Course" prominent button, AI assistant panel (right sidebar, collapsible)
- Profile Editor: 2-column form layout with live preview, AI content generator sidebar

### Student Dashboard  
**Top Navigation**: Horizontal nav with logo left, search center, profile/notifications right

**Main Content Area**:
- Dashboard: Saved courses (3-column grid), application status cards, recommended courses
- Course Search: Filters sidebar (left, 280px), course results (masonry grid), map view toggle
- Applications: Timeline view of application progress, document upload area
- Profile: Single column form with AI writing assistant modal

### Course Catalog (Public + Authenticated)
**Header**: Search bar spanning full width, filter chips below
**Sidebar Filters** (left, 320px): Collapsible filter groups (Location, Subject, Fees, Duration, Level)
**Course Grid**: 3-column card layout (desktop), 2-column (tablet), 1-column (mobile)

---

## Component Library

### Navigation
- **Main Nav**: Horizontal with logo left, links center, auth buttons right, sticky on scroll
- **Sidebar Nav**: Vertical with icon + label, active state with left border accent, hover bg treatment
- **Breadcrumbs**: Above page titles for hierarchical navigation

### Course Cards
- White background, subtle shadow, rounded-xl corners
- University logo badge (top-left corner overlay)
- Course thumbnail image (16:9 aspect ratio, 240px height)
- Content area with 6-unit padding: Title (text-xl), university name (text-sm), meta info row (duration, location, level), fee display (prominent text-2xl), short description (2 lines, text-sm)
- Footer with "View Details" link and heart/bookmark icon

### Forms
- **Input Fields**: Border style, rounded-lg, p-3, focus ring in primary color, label above with text-sm
- **AI Assistant Panel**: Floating card with prompt input, "Generate" button, generated content preview, "Apply" and "Edit" actions
- **File Upload**: Drag-drop zone with dashed border, file list with remove actions
- **Multi-step Forms**: Progress indicator at top, previous/next navigation, save draft option

### Data Display
- **Stats Cards**: White background, icon in colored circle (48px), large number (text-4xl), label below
- **Tables**: Zebra striping optional, sortable headers, row actions (dropdown menu), pagination
- **Timeline**: Vertical line with milestone dots, date/time labels, status badges
- **Badges**: Small rounded-full pills for status (using secondary green for success, accent yellow for pending)

### Modals & Overlays
- **Modal**: Centered with backdrop blur, max-w-2xl, rounded-2xl, close button top-right
- **AI Assistant Modal**: Larger (max-w-4xl) with split view (prompt left, preview right)
- **Toast Notifications**: Top-right corner, slide-in animation, auto-dismiss after 5s

### Buttons
- **Primary**: Background blur when on images, solid primary color otherwise, text-white, px-6 py-3, rounded-lg, hover/active states
- **Secondary**: Outline style in primary color, transparent background
- **Icon Buttons**: 40px square, rounded-lg, centered icon
- **Button Groups**: Segmented controls for toggles

---

## Grid Systems

### Course Grids
- Desktop (lg): 3 columns (grid-cols-3)
- Tablet (md): 2 columns (grid-cols-2)
- Mobile: 1 column (grid-cols-1)
- Gap: gap-6 or gap-8

### Dashboard Stats
- Desktop: 4 columns (grid-cols-4)
- Tablet: 2 columns (grid-cols-2)
- Mobile: 1 column (grid-cols-1)

### Feature Showcases
- Desktop: 3 columns (grid-cols-3)
- All smaller: 1 column (grid-cols-1)

---

## Images

### Hero Image
Large, inspiring photograph of diverse students in modern university setting or collaborative learning environment. Must convey professionalism and inclusivity. Positioned as background with subtle overlay for text readability.

### Course Thumbnails
Each course card requires 16:9 thumbnail image representing the subject area (e.g., science lab, business meeting, art studio). Universities upload these or stock photos as placeholder.

### University Logos
Square format (minimum 200x200px), displayed in circular containers (80px diameter) on course cards and as larger brand elements on university profiles.

### Iconography
Use Heroicons (outline style) throughout for UI icons. Specific icons needed: 
- Academic cap (courses)
- Building library (universities)
- User group (students)
- Magnifying glass (search)
- Sparkles (AI features)
- Document (applications)
- Chart (statistics)

---

## Responsive Behavior
- **Mobile-First**: Stack all multi-column layouts to single column
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Navigation**: Hamburger menu below md breakpoint
- **Sidebars**: Convert to bottom sheets or full-screen overlays on mobile
- **Tables**: Horizontal scroll or card transformation on small screens

---

## Accessibility
- WCAG AA contrast ratios maintained (user-provided colors meet this)
- Focus indicators on all interactive elements (ring-2 ring-primary)
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout
- Screen reader-friendly form labels and error messages

---

## AI Feature Integration
**Visual Treatment**: AI-powered features indicated with sparkle icon, subtle animated gradient border on AI assistant panels, "AI" badge on generated content with option to regenerate

**Interaction Pattern**: Click "AI Assistant" → Modal/sidebar opens → User enters prompt or context → Loading state → Generated content appears → User can edit, regenerate, or apply

---

## Zoho One-Inspired Dashboard System

### Dashboard Shell (`DashboardShell`)
A unified layout component for all user types (Admin, Student, University) featuring:

**Dark Collapsible Sidebar** (left, 256px expanded / 64px collapsed):
- Dark background (bg-slate-900) with subtle borders
- Logo/brand at top with collapse toggle
- "Pinned" section for frequently used items
- Tree navigation with icon + label + optional badge
- User profile section at bottom with avatar, name, role
- Smooth expand/collapse animation

**Top Bar**:
- Module tabs for switching between major sections
- Global search input
- Notification bell with badge
- Settings and user menu dropdowns

**Main Content Area**:
- DashboardWelcome component: Personalized greeting with logo
- Widget grid layout with responsive columns
- Consistent spacing (gap-6)

### Widget Components

**WidgetCard**: Base container for all dashboard widgets
- Consistent header with title, icon, and action buttons
- Loading skeleton state
- Empty state with icon, message, and optional CTA
- Optional noPadding variant for tables

**CompactTable**: Dense data table for widgets
- Density presets: compact, normal, relaxed
- Stage badges with color-coded workflow states
- Priority/Status badges
- Row click handlers
- Responsive column hiding

**StatsWidget**: Summary statistics display
- 2-4 column grid layout
- Icon + value + label pattern
- Color-coded categories (primary, success, warning, danger)
- Trending indicators

**Role-Specific Widgets**:
- **Admin**: ApplicationsWidget, LeadsWidget, TasksWidget, MeetingsWidget, InboxWidget
- **Student**: StudentApplicationsWidget, StudentDocumentsWidget, StudentSavedCoursesWidget, StudentProgressWidget, StudentUpcomingWidget
- **University**: UniversityApplicationsWidget, UniversityCoursesWidget, UniversityTeamWidget, UniversityPendingActionsWidget

### Widget Grid Layout

**WidgetGrid**: Full-width responsive grid
- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column

**WidgetRow**: Two-column layout for paired widgets
- Desktop: 2 columns, equal width
- Mobile: Stack to single column

### Stage Badges Color Scheme
- Assessment: Blue
- Documents Verification: Yellow
- Offer-Letter: Purple
- GS-Clearance: Cyan
- COE: Indigo
- Visa-Lodgment: Orange
- Application Won: Green
- Refusal/Refunds: Red

### Route Structure
- `/admin/home`: Admin dashboard with Zoho layout
- `/student/home`: Student dashboard with Zoho layout
- `/university/home`: University dashboard with Zoho layout
- Original routes (`/admin/dashboard`, `/`) preserved for gradual migration