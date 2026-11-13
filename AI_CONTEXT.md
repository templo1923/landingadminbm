# AI_CONTEXT: Suscripta SaaS

**Objective:** AI Agent handoff and context preservation document. Contains the definitive source of truth for the project's current state, tech stack, and roadmap for seamless development continuation.

## 1. Tech Stack & Environment
- **Core Framework:** Next.js 16.1.6 (App Router), React 19.2.3.
- **Language:** TypeScript (`strict: true` via `tsconfig`).
- **Styling:** Tailwind CSS v4 + PostCSS, emphasizing a "Premium" dark mode UI with glass-morphic surfaces, micro-interactions, and emerald accents.
- **Database & Auth:** Supabase (v2.98.0) and `@supabase/ssr` (v0.9.0) using PostgreSQL. Authentication works via Supabase Auth.
- **File Handling & Parsing:** `react-dropzone` (File Upload UX), `papaparse` (CSV ingestion), `xlsx` / SheetJS (Excel ingestion), `libphonenumber-js` (E.164 verification).
- **Environment Variables:** Must use `.env.local` locally for Vercel/Supabase variables. Never commit `.env`.

## 2. Architecture & Data Models
The application relies heavily on **Server Actions** for database operations and Server Components for initial rendering, moving interactivity to isolated Client Components.

**Key Database Tables (`supabase_setup.sql`):**
- `profiles`: Tied logically via triggers to `auth.users`, serving as the primary source of metadata (Company Name, Role) per SaaS Tenant.
- `whatsapp_connections`: Stores Meta credentials (`waba_id`, `access_token`) mapped strictly via RLS to `user_id`.
- `whatsapp_message_events`: Log aggregation for Meta's webhooks. Fully multi-tenant mapped securely via `user_id`.
- `customers`:
  - **Core Schema**: `id` (UUID), `user_id`, `phone_number` (E.164 format), `first_name`, `last_name_1`, `last_name_2`.
  - **Business Schema**: `payment_status` (`'pending'`, `'paid'`, `'overdue'`, `'cancelled'`), `billing_cycle`, `next_payment_date`.
  - **Lifecycle Schema (Soft Deletes)**: `is_active` (boolean), `inactive_at` (timestamp), `deleted_at` (timestamp).
  - Conflicts handled with `UNIQUE(user_id, phone_number)`.

## 3. Completed Features
- **Project Structure & Security:** Robust Next.js architecture initialized. Server-side middleware route-guarding bounds `/dashboard/*` locations strictly enforcing Next.js SSR authentication (`@supabase/ssr`).
- **Tenant Auth UI:** Beautiful dark-mode native `<SignIn>` and `<SignUp>` screens aligned chronologically interacting with SSR cookie management.
- **Mass Customer Import Module (`/dashboard/clients`):**
  - Advanced mapping wizard ensuring humane-verification sequences mapping precise columns to DB tables.
  - Granular import behaviors: `Append` Mode (Complement) vs `Overwrite` Mode (Hard reset sending contacts to Soft-Delete).
  - Unifies multi-file validation loops natively supporting `.csv`, `.xlsx`, and `.xls`.
- **CRM Contact Core (`/dashboard/contacts`):**
  - Robust query logic rendering distinct tabbed views via Next.js `searchParams` parsing ('Activos', 'Pausados', 'Papelera').
  - Features real-time state actions to Pause/Activate/Delete rows natively managing architectural "Soft Delete" principles rendering immutable traceability.

## 4. Core Business Rules & Constraints
- **WhatsApp Sending Criteria (CRITICAL):** The engine fetching WhatsApp automated reminders **MUST ONLY FETCH** customers whose `payment_status` is explicitly (`'pending'` or `'overdue'`) **AND** dynamically evaluate `is_active = true` AND `deleted_at IS NULL`.
- **Resurrection Logic:** Bulk imports natively restore/resurrect an archived Soft-Deleted client (`deleted_at = null`) if an exact matched E.164 phone string hits standard `upsert`.
- **Idempotent DB Migrations:** Any updates/augmentations to the Database initialization sequence (`supabase_setup.sql`) must aggressively bundle `DROP POLICY/TRIGGER IF EXISTS` ensuring perfectly clean repetitive executions avoiding runtime halts.
- **Language / Interaction Profile:** Always respond to the end-user developer natively in **advanced technological Spanish**. NEVER run destructive operations natively without confirmed console validations.

## 5. Active Context & Next Steps
- **Paused At:** Implementation of proper Auth Middleware isolating Dashboard paths natively wrapping around `public.profiles` auto-sync triggers. DB structural scripts are fully updated and tested, and the "Log Out" functionality integrated inside the layout shell.
- **Immediate Next Technical Tasks:**
  - Establishing cron job intervals or scheduling systems to analyze the populated `customers` constraints and pipe the payload iteratively against the Meta integrations.
  - Construction of the custom WhatsApp Template engine parsing `customer`'s dynamic meta nodes generating mapped notifications.
