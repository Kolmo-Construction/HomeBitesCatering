# Home Bites Catering Management System

## Overview

This is a comprehensive catering management and customer inquiry system designed for a catering business. The application enables both internal business operations (CRM, menu management, form building) and customer-facing features (event inquiry forms with dynamic menu selection). The system handles various event types including weddings, corporate events, birthday parties, and custom catering requests.

The platform supports complex menu configurations with dietary preferences, pricing tiers, and package-based selections. It includes a multi-step inquiry form that adapts based on customer choices, comprehensive menu management with nutritional metadata, and a flexible form builder for creating custom questionnaires.

**Email Intake:** The system receives customer inquiry emails via Google Apps Script (GAS), which sends email data to `/api/gas-email-intake`. Emails are automatically converted into raw leads with AI-powered analysis and communication tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- TanStack Query for server state management and API data fetching
- React Hook Form with Zod for form validation and management
- Radix UI components for accessible, unstyled UI primitives
- Tailwind CSS with shadcn/ui component library for styling
- DnD Kit for drag-and-drop functionality in form builders

**Key Design Patterns:**
- Component composition using Radix UI primitives wrapped in custom UI components
- Multi-step form pattern with conditional navigation based on user selections
- Dynamic form generation from JSON configurations
- Path aliases (@/, @shared/, @assets/) for clean imports

**State Management Strategy:**
- TanStack Query for server state (menu data, questionnaires, opportunities)
- React Hook Form for form state management
- Local component state (useState) for UI-specific concerns
- Form data persisted through multi-step wizards using centralized state objects

**Customer-Facing Forms:**
The inquiry form system uses a wizard pattern where customers progress through steps based on event type and selections. Menu selection is theme-based with package tiers (Bronze/Silver/Gold/Diamond) that enforce selection limits per category. The form adapts dynamically - for example, beverage service shows different paths for alcoholic vs non-alcoholic selections.

### Backend Architecture

**Technology Stack:**
- Node.js with Express for the REST API
- TypeScript for type safety across server code
- Drizzle ORM for database interactions
- PostgreSQL as the primary database (configured via DATABASE_URL)

**API Design:**
RESTful endpoints organized by feature domain:
- `/api/auth/*` - Authentication and session management
- `/api/menus/*` - Menu CRUD operations
- `/api/menu-items/*` - Individual menu item management
- `/api/form-builder/*` - Dynamic questionnaire builder
- `/api/opportunities/*` - Customer inquiry/lead management
- `/api/questionnaires/*` - Public-facing questionnaire retrieval
- `/api/gas-email-intake` - Google Apps Script email webhook for incoming customer emails
- `/api/raw-leads/*` - Raw lead management (pre-opportunity conversion)

**Data Layer (Storage Pattern):**
The application uses a storage abstraction layer (`server/storage.ts`) that wraps Drizzle ORM operations. This provides a consistent interface for database operations and centralizes complex query logic. The storage layer handles relationships between entities (opportunities, clients, contact identifiers) and manages JSONB fields for flexible data structures.

**Authentication:**
Session-based authentication using cookies. The system distinguishes between authenticated admin users (for CRM/menu management) and unauthenticated public users (for inquiry forms).

### Data Storage Solutions

**Database Schema Design:**

**Core Tables:**
- `users` - Admin/staff accounts for system access
- `menu_items` - Individual dishes with dietary metadata (JSONB), ingredients, pricing
- `menus` - Menu configurations and packages (stores complex structures in JSONB)
- `opportunities` - Customer inquiries/leads with event details and form responses
- `clients` - Customer records
- `contact_identifiers` - Flexible contact information (email, phone) linked to opportunities/clients

**JSONB Usage for Flexibility:**
The system heavily uses PostgreSQL's JSONB type for schema-less data that varies by context:
- Menu item `additional_dietary_metadata` - Stores nutritional info, allergen alerts, preparation notes
- Menu `items` field - Stores complex package structures with categories, selection limits, and item references
- Questionnaire `pages` - Stores dynamic form definitions with questions and conditional logic
- Opportunity `formData` - Stores customer responses to inquiry forms (structure varies by event type)

**Dietary Metadata Structure:**
Menu items include boolean flags (isVegetarian, isVegan, isGlutenFree, etc.) for basic filtering, plus rich JSONB metadata containing dietary flag lists, allergen alerts, nutritional highlights, and customer guidance text.

**Menu Package Structure:**
Menus can be simple item lists OR complex package-based structures. Package structures include:
- Theme metadata (title, description)
- Package tiers (Bronze/Silver/Gold/Diamond) with pricing and guest minimums
- Categories with selection limits
- References to menu items by ID
- Per-item upcharges

### Authentication & Authorization

**Authentication Mechanism:**
Cookie-based sessions stored server-side. Login endpoint (`/api/auth/login`) validates credentials and establishes session. Middleware checks authentication status for protected routes.

**Authorization Model:**
Binary admin/public model - authenticated users have full access to admin features (menu management, CRM, form builder), while public users can only access inquiry forms and submit opportunities.

**Session Management:**
Sessions persist across requests via HTTP-only cookies. The `/api/auth/me` endpoint returns current user information for client-side authentication state.

### External Dependencies

**Database:**
- PostgreSQL (required) - Primary data store, accessed via DATABASE_URL environment variable
- Drizzle ORM - Database query builder and migration tool
- @neondatabase/serverless - Serverless PostgreSQL driver for Neon hosting

**Email Services:**
- SendGrid (@sendgrid/mail) - Transactional email delivery (inquiry confirmations, notifications)

**AI/ML Services:**
- Anthropic SDK (@anthropic-ai/sdk) - Claude AI integration (likely for form generation or customer inquiry processing)

**UI Component Libraries:**
- Radix UI - Accessible component primitives (@radix-ui/react-*)
- shadcn/ui - Pre-built component library built on Radix (configured in components.json)
- Tailwind CSS - Utility-first styling framework

**Development Tools:**
- Vite - Frontend build tool and dev server
- Replit-specific plugins (@replit/vite-plugin-*) - Development environment integration
- drizzle-kit - Database migration management

**Key Third-Party Integrations:**
The system is designed to integrate with external services through environment configuration:
- **Google Apps Script (GAS):** Primary email intake method. External GAS monitors Gmail inbox and forwards cleaned email data to `/api/gas-email-intake` for processing.
- **Google Cloud Storage (GCP):** Stores full email bodies and attachments for archival and retrieval via `gcpStorageService.ts`.
- **Anthropic Claude AI:** Powers AI-driven lead analysis, extracting event details, sentiment, quality scores, and next-step recommendations from incoming emails.

**Important Notes:**
- Gmail sync services were removed from the codebase (November 2024) to simplify the architecture. Email intake now exclusively uses Google Apps Script webhook.
- All email communications are tracked in the `communications` table with links to opportunities/raw leads via `gmailThreadId`.