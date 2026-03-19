# Features And Working

This document explains what the project does and how the main systems work together.

## 1. Product Identity

Agency OS is a multi-tenant agency management platform with two big faces:

- A public marketing website for lead generation and content.
- A private operations platform for agencies, clients, employees, managers, admins, and super-admins.

It is built around:

- Next.js 16 App Router
- React 19
- MongoDB and Mongoose
- Server Actions plus route handlers
- Brevo email notifications
- Hybrid file storage using Vercel Blob and Azure Blob
- A configurable AI layer called Singularity

## 2. Public Website And Content Layer

### What it includes

- Marketing home page
- About page
- Services hub and service landing pages
- Blog listing and blog detail pages
- Contact page
- Get started / signup flow
- Marketing admin CMS

### Main code areas

- Routes in `app/(marketing)/`
- Marketing UI in `components/marketing/`
- Marketing models in `models/marketing/`
- Marketing DB connector in `lib/marketing-db.js`
- Marketing APIs in `app/api/blog-dc/`, `app/api/category/`, `app/api/contact-dc/`, `app/api/testimonial/`, and `app/api/auth-dc/`

### How it works

- The public site is its own route group under `app/(marketing)`.
- Blog, category, testimonial, and contact data use dedicated marketing models instead of the agency operations models.
- The contact form stores inbound leads and also sends thank-you plus admin notification emails.
- Contact and marketing-auth flows include rate limiting and CSRF checks.
- The marketing admin page acts like a light CMS for blogs, categories, and testimonials.

## 3. Authentication, Sessions, And Onboarding

### Supported account types

- `superadmin`
- `admin`
- `manager`
- `employee`
- `client`

### Main code areas

- Session and password logic in `lib/auth.ts`
- JWT utilities in `lib/auth-utils.ts`
- Route protection in `proxy.ts`
- Access checks in `lib/actions/access.ts`
- Login page and forgot-password flow in `app/login/`
- Signup routes in `app/api/signup/`
- Password-reset routes in `app/api/forgot-password/`

### How it works

- App auth is cookie-based and uses an `auth_token` JWT.
- `proxy.ts` protects `/dashboard/*` and `/super-admin/*`, redirects unauthenticated users, and enforces role-aware route access.
- `getSessionUser()` is the shared session source of truth.
- Login checks three identity stores: super admins, agency users, and clients.
- Signup creates a new agency, a first admin user, usage counters, plan defaults, trial dates, and optional default AI config inheritance.
- Signup and password reset both use OTP codes stored in MongoDB with TTL and attempt limits.
- Archived users and archived clients cannot log in.
- Suspended agencies are blocked at session validation time.

## 4. Multi-Tenancy, Agency Context, And Plan Gating

### Main code areas

- `lib/agency-context.ts`
- `lib/mongodb.ts`
- `lib/mongodb-tenant-models.ts`
- `components/layout/AuthenticatedLayout.tsx`

### How it works

- Most operational records are scoped by `agencyId`.
- `getCurrentAgency()` resolves the current tenant from the logged-in user or selected super-admin agency context.
- Agency usage and limits are tracked for users, projects, clients, storage, and monthly invoices.
- Trial expiration and paid-plan expiration are checked before rendering the main authenticated shell.
- The dashboard shell also pulls branding, currency, and favicon data from agency settings.

## 5. Dashboard Shell And Shared UX

### What it includes

- Sidebar navigation
- Topbar with search, notifications, and user menu
- Timezone handling
- Currency formatting
- Floating chat overlay
- Tenant branding

### Main code areas

- `components/layout/AuthenticatedLayout.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Topbar.tsx`
- `context/TimezoneContext.tsx`
- `context/CurrencyContext.tsx`
- `components/providers/DashboardChatProvider.tsx`

### How it works

- Every authenticated agency page renders inside `AuthenticatedLayout`.
- The shell wires in timezone detection, currency context, top navigation, sidebar navigation, and the messaging overlay.
- The topbar performs global search and notification loading using server actions.
- The sidebar hides or shows sections depending on role, especially for clients.
- Agency branding is dynamic, including logo and favicon.

## 6. Dashboard Home

### Main code areas

- `app/dashboard/page.tsx`
- `components/dashboard/DashboardContent.tsx`
- `lib/actions/dashboard.ts`
- `lib/exportActions.ts`

### How it works

- Dashboard behavior changes by role.
- Admins and managers see business metrics, charts, urgent tasks, recent activity, leave alerts, and export actions.
- Employees see task workload, deadlines, leave status, and project involvement.
- Clients see a client-specific portal view with project stats, invoices, tasks, assets, and notifications.
- Export reporting pulls transactions, invoices, tasks, and projects inside a date range for the current agency.

## 7. Projects, Tasks, Services, And Delivery Workflow

### What it includes

- Project list with filters and grid/list views
- Project creation wizard
- Project detail workspace
- Task Kanban board
- Task comments
- Task AI helper
- Project services management
- Project settings and danger zone
- Payment configuration per service

### Main code areas

- Routes: `app/dashboard/projects/` and `app/dashboard/projects/[slug]/`
- UI: `components/projects/`
- Queries: `lib/actions/project-queries.ts`, `lib/actions/task-queries.ts`, `lib/actions/service-queries.ts`
- Mutations: `lib/actions/project-mutations.ts`, `lib/actions/task-mutations.ts`, `lib/actions/service-mutations.ts`
- Workflow logic: `lib/actions/project-update-workflow.ts`, `lib/actions/task-effects.ts`

### How it works

- The projects list page loads projects, services, tasks, and users in parallel, then computes progress client-side.
- New project creation is a 4-step flow:
  - Basic details
  - Services
  - Payment configuration
  - Review and create
- Project detail pages load project, tasks, directory users, assets, services, permissions, and finance data in parallel.
- The project workspace exposes tabs for:
  - Board
  - Finance
  - Assets
  - Services
- Tasks support creation, editing, reassignment, comments, and status changes.
- Task status changes create activity logs, trigger notifications, optionally send emails, and can auto-complete or reopen the parent project.
- Project updates also sync service references and block service removal when tasks still depend on those categories.
- Project settings let admins update status, rename the project, reassign the client, enable AI on assets, and delete the project with password confirmation.

## 8. Task AI And Project Intelligence

### What it includes

- AI task explanation
- AI task description enhancement
- AI task field extraction
- AI hour estimation
- Per-task AI chat box
- Project asset AI toggles

### Main code areas

- `components/projects/AIChatBox.tsx`
- `lib/actions/ai-runtime.ts`
- `lib/actions/ai-task.ts`
- `lib/actions/ai-task-chat.ts`
- `lib/actions/ai-estimation.ts`

### How it works

- Task AI is separate from the full Singularity agent.
- It builds context from the current task, project board state, assigned users, and AI-enabled assets.
- The task chat box creates a persistent live session when supported, otherwise it falls back to a legacy stateless request path.
- AI can turn a free-form response back into structured task fields such as title, description, category, priority, and estimated hours.
- AI usage is logged per feature, user, agency, model, and token usage.

## 9. Assets, Upload Security, And Storage

### What it includes

- File assets
- Links
- Text/code assets
- Asset metadata editing
- AI-enable toggle per asset
- Secure file upload pipeline

### Main code areas

- UI: `components/projects/AssetList.tsx`, `AddAssetModal.tsx`, `AddAssetSecureUploadPanel.tsx`
- Actions: `lib/actions/assets.ts`
- Upload APIs: `app/api/upload-blob/route.js`, `app/api/upload-dc/route.js`
- Validation: `lib/upload-security.ts`
- Storage adapters: `lib/storage.ts`, `lib/azure-storage.ts`

### How it works

- Assets are stored in MongoDB as project-linked records.
- Direct uploads can use Vercel Blob token generation with server-side validation hooks.
- There is also a server-upload path for form-data uploads.
- Upload validation checks:
  - allowed extension
  - content type
  - file size
  - image magic bytes
  - image dimensions
  - project access
  - agency storage limit
- Storage usage is reserved back into the agency counters after upload.
- Vercel Blob is used first until a usage threshold is reached, then uploads fall back to Azure Blob storage.
- Deleting an asset also attempts to delete the underlying stored file and reduce recorded storage usage.

## 10. Finance, Invoices, Payroll, Refunds, And Reporting

### What it includes

- Finance overview
- Filters by project, user, and category
- Transactions
- Invoices
- Payroll
- Refund creation
- Client finance portal
- Team and project finance detail views

### Main code areas

- Route: `app/dashboard/finance/`
- UI: `components/finance/`
- Queries: `lib/actions/finance-queries.ts`
- Mutations: `lib/actions/finance-mutations.ts`
- Invoice workflow: `lib/actions/finance-invoice-workflow.ts`
- Shared helpers: `lib/actions/finance-shared.ts`, `finance-mutation-shared.ts`
- Reporting: `lib/exportActions.ts`

### How it works

- Finance pages resolve filters from the query string and then branch into overview, project, team, category, or client-specific views.
- Admins and managers can create transactions and invoices and manage payroll.
- Clients only see their own invoices and transactions and can mark invoices as paid.
- Invoice payment flow is staged:
  - Client marks invoice as paid
  - Invoice moves to `Processing`
  - Admin approves or rejects
  - Approval creates an income transaction
  - Notifications and Brevo emails are sent during the process
- Payroll uses employee salary records and creates payment actions month by month.
- Refunds, project summaries, and category/member summaries are also part of the finance model.
- Export reporting gathers cross-module financial and operational data for CSV-style reporting.

## 11. Team, Profiles, Leave, And Internal Operations

### What it includes

- Team directory
- Add/edit members
- Archived member restore
- Leave requests
- Employee profile analytics
- Document manager
- Contribution heatmap

### Main code areas

- Routes: `app/dashboard/team/` and `app/dashboard/team/[username]/`
- UI: `components/team/`, `components/leave-requests-list.tsx`, `components/leave-request-dialog.tsx`
- Queries: `lib/actions/user-queries.ts`, `lib/actions/leave.ts`
- Mutations: `lib/actions/user-mutations.ts`, `lib/actions/user-lifecycle.ts`

### How it works

- Team pages load the current user, team list, and pending leave requests in parallel.
- Admins and managers can add team members and review leave requests.
- Admins can also switch to the archived-members view and restore deactivated users.
- Employee profile pages aggregate tasks, projects, activities, leave records, contribution history, and derived stats.
- Profile pages also support chat initiation, vCard download, and role-aware editing.
- Leave flows cover request, approval, rejection, cancellation, stats, and notifications.

## 12. Clients And Client Portal

### What it includes

- Client list
- Add/edit client
- Archive and restore client
- Permanent client delete
- Client profile tabs
- Client-facing dashboard and finance visibility

### Main code areas

- Routes: `app/dashboard/clients/` and `app/dashboard/clients/[slug]/`
- UI: `components/clients/` and `app/dashboard/clients/[slug]/_components/`
- Queries: `lib/actions/client-queries.ts`
- Mutations: `lib/actions/client-mutations.ts`

### How it works

- Client directory pages support search, archive view, restore, and permanent deletion with confirmation.
- Client detail pages load profile, projects, finance data, activity logs, and project tasks.
- Tabs break the view into overview, projects, finance, and activity.
- Clients themselves are blocked from viewing other clients and can only access their own detail routes.
- The client dashboard and client finance flow reuse the same scoped data model and role guards.

## 13. Messaging And Chat Overlay

### What it includes

- Contact list
- Message thread
- Presence and last-active state
- Unread counts
- Inline chat overlay from dashboard pages

### Main code areas

- Route: `app/dashboard/messages/`
- UI: `components/chat/`
- Shared state: `context/ChatContext.tsx`
- Provider: `components/providers/DashboardChatProvider.tsx`
- Server logic: `lib/chat.ts`

### How it works

- Messaging is available as both a full page and a dashboard overlay.
- Contacts are derived from users, clients, and message history inside the current agency.
- Presence is approximated through `lastActiveAt` heartbeat updates.
- Threads are loaded per user pair and unread counts are aggregated server-side.
- The overlay can be opened from team and client profile views so conversations start from context.

## 14. Singularity AI Assistant

### What it includes

- Chat mode
- Agent mode
- Live audio-capable mode
- Tool calling across agency operations
- Conversation history
- Checkpoints
- Rollback analysis and execution
- Attachment support for images and documents

### Main code areas

- Route: `app/dashboard/singularity/`
- API: `app/api/singularity/`, `app/api/singularity/history/`, `app/api/singularity/history/checkpoint/`
- UI: `components/singularity/`
- Tool executor: `lib/singularity-tools.ts`
- Route handling: `lib/singularity-route-chat.ts`, `lib/singularity-route-agent.ts`
- History and rollback: `lib/singularity-history*.ts`
- Tool families:
  - read-only
  - project/task write
  - finance
  - management
  - admin
  - delete

### How it works

- Access to Singularity is controlled by role, agency AI settings, and explicit per-user AI permission overrides.
- Chat mode streams a conversational answer.
- Agent mode builds a system context, filters tools by permissions, and lets the model execute operations through declared tools.
- Tool permissions are mapped by role and tool name.
- Tool execution can capture rollback snapshots for project, task, client, invoice, transaction, service, and leave-related changes.
- Session history is persisted so users can reopen prior conversations.
- Checkpoints let the system inspect what would be rolled back before the user commits to undo.
- AI traffic is logged for monitoring and super-admin analytics.

## 15. Agency Settings

### What it includes

- Appearance and theme
- Permission management
- AI settings
- Security settings
- Agency branding
- Email settings

### Main code areas

- Route: `app/dashboard/settings/`
- UI: `components/settings/`
- Actions: `lib/actions/agency-settings.ts`

### How it works

- Settings are only available to admins and managers.
- Appearance controls theme selection in the client shell.
- Permission settings manage per-user operational permissions such as project creation and AI access.
- AI settings define provider, model, API key behavior, and AI feature permissions.
- General settings control agency branding, logos, colors, and email notification behavior.
- Security settings handle password changes and security policy controls at the agency level.

## 16. Super-Admin Platform Layer

### What it includes

- Platform dashboard
- Agency directory
- Create, suspend, activate, delete, and update agencies
- Billing overview
- Global analytics
- AI usage monitoring
- Storage monitoring
- System logs
- Global settings
- Per-agency AI configuration
- Default AI configuration for new signups

### Main code areas

- Routes in `app/super-admin/`
- UI in `components/super-admin/`
- Actions in `lib/actions/super-admin.ts`, `super-admin-queries.ts`, `super-admin-ops.ts`, and `super-admin-agency-lifecycle.ts`

### How it works

- Super-admin routes are isolated from the agency dashboard and guarded separately.
- Agencies are treated as first-class platform tenants with plan, status, usage, and feature data.
- The billing screen estimates MRR from plan pricing.
- AI analytics summarize tokens, requests, users, agencies, and storage usage.
- System settings define platform defaults for:
  - platform identity
  - security policy
  - notification defaults
  - email defaults
  - default AI config
- Global defaults can be inherited by newly created agencies during signup.

## 17. AI Provider Abstraction

### Main code areas

- `lib/ai-provider.ts`
- `lib/ai-provider-gemini.ts`
- `lib/ai-provider-openai-compat.ts`
- `lib/ai-models.ts`

### How it works

- The app is provider-aware instead of hard-coding one inference backend.
- Gemini is the main path today, including live/native-audio models.
- OpenAI-compatible backends are supported through a compatibility layer.
- Models are selectable through agency and super-admin AI settings.

## 18. Email And Notifications

### Main code areas

- `lib/brevo-mail.ts`
- `lib/brevo-mail-projects.ts`
- `lib/brevo-mail-tasks.ts`
- `lib/brevo-mail-finance.ts`
- `lib/brevo-mail-team.ts`
- `lib/brevo-mail-accounts.ts`
- `lib/actions/dashboard.ts`
- `lib/actions/task-effects.ts`
- `lib/actions/project-update-workflow.ts`
- `lib/actions/finance-invoice-workflow.ts`

### How it works

- In-app notifications are stored in MongoDB and shown in the topbar.
- Email notifications are organized by domain: projects, tasks, finance, team, and accounts.
- Agency settings and super-admin defaults can disable or fine-tune which categories send email.
- Task and project workflows create both database notifications and Brevo emails when allowed.

## 19. Security Model

### Main controls currently in the code

- Route protection through `proxy.ts`
- JWT session cookies
- Agency suspension checks
- Trial and plan expiration checks
- CSRF origin validation on mutation routes
- Strong-password policy support
- Rate limiting for login, signup, contact, OTP, and marketing admin auth
- Upload allowlists and binary validation
- Security headers from `next.config.ts`

## 20. Scripts And Utilities

### Script groups

- Account bootstrap:
  - `scripts/seed-accounts.js`
  - `scripts/migrate-passwords.js`
- Data movement and repair:
  - `scripts/import-db.js`
  - `scripts/export-db.js`
  - `scripts/fix-db.js`
  - `scripts/cleanup-db.mjs`
  - `scripts/verify-db.mjs`
  - `scripts/inspect-db.mjs`
- AI and live-mode debugging:
  - `scripts/test-live-*.mjs`
  - `scripts/test-flash-lite*.mjs`
- Content utilities:
  - `scripts/create-email-templates.js`

### How they fit in

- Scripts support seeding, troubleshooting, migration, verification, and provider-level AI testing outside the UI.
- They are useful for setup, debugging, and operational maintenance, but they are not part of the request path of the app itself.

## 21. End-To-End System Summary

At a high level the platform works like this:

- Public visitors use the marketing site, contact form, blog, and signup flow.
- Signup creates a new agency tenant and first admin account.
- Authenticated users enter a role-aware dashboard shell.
- Server actions enforce role and agency scope before reading or mutating data.
- MongoDB stores all operational records, plus AI history and platform analytics.
- Email, notifications, storage, and AI are cross-cutting services attached to workflow events.
- Super-admin tools manage tenants, defaults, and platform-wide monitoring above the agency layer.
