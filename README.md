# Agency OS

Agency OS is a full-stack, multi-tenant operations platform for creative,
marketing, and software service agencies. It combines project delivery, task
management, client portals, finance, internal chat, transactional email, and
AI-assisted workflows in one Next.js application.

The project is built as a practical reference for teams that want to study or
adapt a modern agency SaaS architecture: tenant isolation, role-based access,
agentic AI tools, rollback-safe mutations, secure uploads, and operational
dashboards.

Repository: https://github.com/pr4dyuman/DC

## Highlights

- Multi-tenant agency workspaces with platform-level super admin controls.
- Role-based access for super admins, admins, managers, specialists,
  employees, and clients.
- Project and task management with Kanban boards, comments, assignees,
  priorities, due dates, service categories, and project assets.
- Client portal for project visibility, task requests, assets, invoices, and
  payment status.
- Finance workspace for transactions, invoices, payroll-style records,
  revenue charts, filters, and exports.
- Singularity AI assistant with chat and agent modes, tool execution, live
  agency context, checkpoints, and rollback support.
- AI Blogger pipeline for trend discovery, grounded research, draft
  generation, SEO review, internal linking, webhook publishing, and
  performance sync.
- Configurable AI providers for agency features, including Gemini and
  OpenAI-compatible providers.
- Secure storage paths using Vercel Blob first and Azure Blob fallback.
- Transactional email notifications through Brevo.
- Marketing website, blog, service pages, sitemap, robots.txt, and SEO audit
  utilities.

## Why This Exists

Small and mid-size agencies often run on a patchwork of task boards,
spreadsheets, chat tools, invoices, client documents, and AI prompts. Agency OS
turns that workflow into a single open codebase that maintainers can inspect,
extend, and self-host.

The most reusable parts of the repository are not only the UI screens. They are
the patterns around tenant-scoped data access, RBAC enforcement, AI tool
permissions, rollback checkpoints, AI usage logging, and content quality gates.
Those patterns are useful for other teams building internal tools, vertical
SaaS products, and AI-native operations software.

## Open Source Sustainability

This repository is public and under active development. The current maintainer
workload includes:

- Reviewing and merging feature branches and pull requests.
- Keeping Next.js, React, TypeScript, MongoDB, AI SDKs, and UI dependencies
  current.
- Maintaining tenant isolation, auth, RBAC, AI tool safety, and finance logic.
- Expanding test coverage for AI Blogger, task assignment, project services,
  marketing blog rendering, webhook delivery, and SEO quality checks.
- Managing release notes, migration steps, issue triage, and security fixes.

AI coding credits would be useful for core maintenance work such as:

- Pull request review and regression-risk summaries.
- Generating focused tests for RBAC, tenant isolation, AI tools, and webhook
  paths.
- Refactoring large server-action modules into safer, smaller units.
- Dependency upgrade planning and release-note drafting.
- Security review of upload, auth, AI key encryption, and multi-tenant query
  paths.
- Maintainer automation for issue triage, changelog generation, and
  reproduction steps.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS v4, Radix UI, shadcn-style components |
| Language | TypeScript and JavaScript |
| Database | MongoDB Atlas or local MongoDB through Mongoose |
| Auth | JWT with `jose`, HTTP-only cookies, bcrypt password hashing |
| AI | Gemini, OpenAI-compatible providers, encrypted per-agency keys |
| Charts | Recharts |
| Drag and drop | `@dnd-kit` |
| Email | Brevo transactional email |
| Storage | Vercel Blob with Azure Blob fallback |
| Analytics | Vercel Analytics, Speed Insights, Google Analytics helpers |
| Tests | Node test runner with TypeScript support through `tsx` |

## Core Modules

### Agency Platform

- Agency creation, suspension, deletion, plans, limits, and platform settings.
- Super admin views for agencies, users, billing, analytics, AI usage, and
  AI Blogger configuration.
- Per-agency settings for branding, permissions, security, email, and AI
  provider configuration.

### Project Delivery

- Projects with clients, budgets, services, statuses, slugs, due dates, and
  payment schedules.
- Kanban task board with drag-and-drop, comments, priorities, categories,
  estimates, assignees, and due-date handling.
- Project assets with link, image, file, code, folder, and zip types.
- AI context toggles for project assets.

### Client Portal

- Client-specific dashboard with project status, tasks, notifications, assets,
  invoices, and payment actions.
- Read-only project visibility with controlled client task requests.
- Isolation from internal finance, team, settings, and unrelated client data.

### Finance

- Income and expense transactions with category-aware forms.
- Invoice workflow from pending to client-submitted processing to approved or
  rejected.
- Payroll and people-linked transaction views.
- Revenue charts, filters, financial summaries, and CSV exports.

### Singularity AI Assistant

Singularity is an agency-aware AI assistant with two modes:

- Chat mode for general writing, planning, and Q&A.
- Agent mode for tool-calling workflows that can read and update agency data
  according to role permissions.

The assistant receives scoped context about the current user, agency, projects,
tasks, clients, team workload, finance summary, and recent activity. Mutating
tools create checkpoints so actions can be rolled back when needed.

Examples of supported tools:

- Search agency data.
- Create, edit, reassign, bulk-create, and estimate tasks.
- Update task status and add comments.
- Create and update projects.
- Add transactions and create invoices.
- Create or update clients.
- Manage leave requests.
- Read finance summaries, team workload, invoices, transactions, activity, and
  employee profiles.

### AI Blogger

AI Blogger is a content operations pipeline for agency websites. It includes:

- Trend discovery and website-fit analysis.
- SERP and grounded research workflows.
- Advanced brief parsing and draft generation.
- SEO strategy readiness checks and final quality gates.
- Metadata validation, internal linking, and blocker classification.
- Webhook publishing and delivery diagnostics.
- Search Console OAuth, performance sync, and scheduled refresh paths.

## Repository Layout

```text
app/                    Next.js routes, dashboards, marketing pages, APIs
components/             UI, dashboard, project, finance, AI, and marketing components
context/                React context providers
hooks/                  Shared React hooks
lib/                    Auth, actions, AI providers, storage, email, DB, utilities
models/                 Marketing Mongoose models
public/                 Static assets, images, fonts, robots.txt
scripts/                SEO, internal-link, GSC, and email-template utilities
tests/                  Node test files for AI Blogger and core helpers
doc/                    Operational notes and generated analysis artifacts
```

## Getting Started

### Prerequisites

- Node.js 24.x
- npm
- MongoDB Atlas cluster or a local MongoDB instance
- Optional provider accounts for AI, email, storage, Search Console, and SERP
  features

### Install

```bash
git clone https://github.com/pr4dyuman/DC.git
cd DC
npm install
```

Create `.env.local`:

```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
AI_ENCRYPT_KEY=64-hex-character-key-for-aes-256-gcm
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

### Required For The Core App

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify auth sessions |
| `AI_ENCRYPT_KEY` | 32-byte hex key used to encrypt stored AI provider keys |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL used in links, redirects, and emails |

### Optional Integrations

| Variable | Purpose |
| --- | --- |
| `BREVO_API_KEY` | Transactional email delivery |
| `BREVO_SENDER_EMAIL` | Sender email for app notifications |
| `BREVO_SENDER_NAME` | Sender name for app notifications |
| `BREVO_REPLY_TO_EMAIL` | Reply-to email for transactional messages |
| `BREVO_REPLY_TO_NAME` | Reply-to name for transactional messages |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob fallback storage |
| `AZURE_STORAGE_CONTAINER` | Azure Blob container name |
| `GOOGLE_CLIENT_ID` | Search Console OAuth |
| `GOOGLE_CLIENT_SECRET` | Search Console OAuth |
| `GOOGLE_OAUTH_REDIRECT_URI` | Explicit Google OAuth redirect URI |
| `GSC_SITE_URL` | Search Console property for CLI utilities |
| `AI_BLOGGER_WEBHOOK_SECRET` | Verifies inbound blog webhook requests |
| `AI_BLOGGER_WORKER_SECRET` | Protects AI Blogger worker endpoints |
| `AI_BLOGGER_SCHEDULE_SECRET` | Protects scheduled AI Blogger routes |
| `AI_BLOGGER_PERFORMANCE_SECRET` | Protects performance sync routes |
| `CRON_SECRET` | Shared fallback secret for scheduled routes |
| `NEXT_PUBLIC_SITE_URL` | Public marketing website URL |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics measurement ID |

AI provider API keys are normally configured per agency inside the super admin
settings UI and stored encrypted in MongoDB.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run audit:seo` | Run the local SEO QA utility |
| `npm run audit:links` | Audit internal marketing links |
| `npm run audit:email-templates` | Audit transactional email templates |
| `npm run gsc` | Use the Search Console helper |
| `npm run gsc:auth` | Start Search Console OAuth helper flow |
| `npm run gsc:report` | Generate a Search Console report |

## Tests

The repository includes focused tests for AI Blogger workflows, grounded
research, trend selection, SEO strategy scoring, webhook delivery, marketing
blog rendering, project service normalization, and task assignee compatibility.

Run a focused test file with:

```bash
npx tsx --test tests/task-assignees.test.ts
```

Some test files import server-only modules and expect the core auth/database
environment variables to exist. In PowerShell, run the full current test suite
with:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/agency-os-test"
$env:JWT_SECRET = "test-secret-for-local-tests"
node --require ./tests/register-server-only-stub.cjs --import tsx --test (Get-ChildItem tests -Filter *.test.ts).FullName
```

## Security And Data Isolation

- All authenticated server actions resolve the current user and agency before
  reading or writing tenant data.
- Role checks guard sensitive project, finance, admin, AI, and settings
  mutations.
- AI tools have a role-aware execution matrix instead of unrestricted function
  access.
- Stored AI provider keys are encrypted with AES-256-GCM.
- Auth sessions use JWTs and HTTP-only cookies.
- Critical deletes require password confirmation.
- Upload handling blocks dangerous extensions and enforces file-size checks.
- AI agent actions create checkpoints that support rollback.

## Maintainer Roadmap

- Add a formal OSI-approved license and contributor guide.
- Add a public issue template for bugs, security reports, and feature requests.
- Add a single `npm test` script and CI workflow for lint and core tests.
- Expand tenant-isolation regression tests around server actions.
- Split the largest server-action and AI Blogger modules into smaller units.
- Add screenshots and hosted demo data for easier evaluation.
- Document deployment paths for Vercel, MongoDB Atlas, Vercel Blob, Azure Blob,
  Brevo, and Search Console.

## Contributing

Issues and pull requests are welcome once the repository has a formal license
and contribution guide. Until then, please open an issue describing the change,
the affected module, and any migration or environment impact.

Good first contribution areas:

- Tests for tenant-scoped reads and writes.
- UI accessibility fixes.
- AI Blogger quality-gate tests.
- Smaller documentation improvements.
- Dependency update verification.
- Release and changelog automation.

## License

No open-source license has been committed yet. Before this project is presented
as formal open-source software, add an OSI-approved license such as MIT,
Apache-2.0, or AGPL-3.0, depending on the intended reuse model.
