# Route And Module Map

This file maps the codebase by route group, backend surface, and major folder responsibility.

## 1. Route Groups

| Route Group | Purpose |
| --- | --- |
| `app/(marketing)` | Public website and marketing admin CMS |
| `app/login` | Shared login and password recovery |
| `app/dashboard` | Agency operating system for users and clients |
| `app/super-admin` | Platform-level management for super admins |
| `app/api` | API routes for signup, OTP, uploads, marketing content, and Singularity |
| `app/trial-expired`, `app/plan-expired` | Plan gating and lifecycle pages |

## 2. Public Marketing Pages

| Route | Purpose | Main UI |
| --- | --- | --- |
| `/` | Home page | `app/(marketing)/page.jsx` |
| `/about` | Agency story page | `app/(marketing)/about/page.js` |
| `/services` | Services hub | `app/(marketing)/services/page.js` |
| `/services/web-development` | Service landing page | `app/(marketing)/services/web-development/page.js` |
| `/services/video-production-ad` | Service landing page | `app/(marketing)/services/video-production-ad/page.js` |
| `/services/social-media-marketing` | Service landing page | `app/(marketing)/services/social-media-marketing/page.js` |
| `/services/seo` | Service landing page | `app/(marketing)/services/seo/page.js` |
| `/services/ppc` | Service landing page | `app/(marketing)/services/ppc/page.js` |
| `/services/influencer-marketing` | Service landing page | `app/(marketing)/services/influencer-marketing/page.js` |
| `/services/manage-company` | Agency OS showcase page | `app/(marketing)/services/manage-company/page.jsx` |
| `/blog` | Blog listing | `app/(marketing)/blog/page.jsx` |
| `/blog/[slug]` | Blog detail | `app/(marketing)/blog/[slug]/page.jsx` |
| `/contact` | Contact form | `app/(marketing)/contact/page.js` |
| `/get-started` | Agency signup landing flow | `app/(marketing)/get-started/page.jsx` |
| `/admin` | Marketing admin CMS | `app/(marketing)/admin/page.js` |
| `/admin/create` | Create or edit blog content | `app/(marketing)/admin/create/page.js` |

## 3. Dashboard Pages

| Route | Purpose | Main Entry File |
| --- | --- | --- |
| `/dashboard` | Role-based overview dashboard | `app/dashboard/page.tsx` |
| `/dashboard/projects` | Project directory | `app/dashboard/projects/page.tsx` |
| `/dashboard/projects/[slug]` | Project workspace | `app/dashboard/projects/[slug]/page.tsx` |
| `/dashboard/finance` | Finance hub | `app/dashboard/finance/page.tsx` |
| `/dashboard/messages` | Messaging workspace | `app/dashboard/messages/page.tsx` |
| `/dashboard/singularity` | Full AI assistant | `app/dashboard/singularity/page.tsx` |
| `/dashboard/team` | Team directory and leave requests | `app/dashboard/team/page.tsx` |
| `/dashboard/team/[username]` | Employee or client profile view | `app/dashboard/team/[username]/page.tsx` |
| `/dashboard/clients` | Client directory | `app/dashboard/clients/page.tsx` |
| `/dashboard/clients/[slug]` | Client profile workspace | `app/dashboard/clients/[slug]/page.tsx` |
| `/dashboard/settings` | Agency settings | `app/dashboard/settings/page.tsx` |

## 4. Dashboard Feature Modules

| Area | Main UI Modules | Main Action Modules |
| --- | --- | --- |
| Shell | `components/layout/*` | `lib/actions/access.ts`, `lib/actions/dashboard.ts` |
| Dashboard home | `components/dashboard/*` | `dashboard.ts`, `super-admin.ts` for currency |
| Projects | `components/projects/*` | `project-queries.ts`, `project-mutations.ts`, `project-update-workflow.ts`, `task-*`, `service-*` |
| Finance | `components/finance/*` | `finance-queries.ts`, `finance-mutations.ts`, `finance-invoice-workflow.ts` |
| Team | `components/team/*`, leave components | `user-*`, `leave.ts` |
| Clients | `components/clients/*` | `client-queries.ts`, `client-mutations.ts` |
| Messages | `components/chat/*` | `lib/chat.ts` |
| Settings | `components/settings/*` | `agency-settings.ts` |
| Singularity | `components/singularity/*` | `singularity-chat.ts`, `ai-runtime.ts`, `singularity-tools.ts` |

## 5. Super-Admin Pages

| Route | Purpose | Main Entry File |
| --- | --- | --- |
| `/super-admin` | Platform dashboard | `app/super-admin/page.tsx` |
| `/super-admin/agencies` | Agency list | `app/super-admin/agencies/page.tsx` |
| `/super-admin/agencies/new` | Create agency | `app/super-admin/agencies/new/page.tsx` |
| `/super-admin/agencies/[id]` | Agency detail and controls | `app/super-admin/agencies/[id]/page.tsx` |
| `/super-admin/billing` | Subscription and MRR view | `app/super-admin/billing/page.tsx` |
| `/super-admin/analytics` | Platform analytics | `app/super-admin/analytics/page.tsx` |
| `/super-admin/analytics/ai` | AI usage monitoring | `app/super-admin/analytics/ai/page.tsx` |
| `/super-admin/users` | Super-admin user management view | `app/super-admin/users/page.tsx` |
| `/super-admin/logs` | System logs | `app/super-admin/logs/page.tsx` |
| `/super-admin/settings` | Platform settings | `app/super-admin/settings/page.tsx` |
| `/super-admin/settings/ai/[id]` | Agency AI configuration detail | `app/super-admin/settings/ai/[id]/page.tsx` |

## 6. API Route Surface

### Auth, Signup, And Recovery

| Route | Responsibility |
| --- | --- |
| `/api/signup` | Create a new agency and first admin |
| `/api/signup/send-otp` | Send signup OTP |
| `/api/forgot-password/send-otp` | Send password-reset OTP |
| `/api/forgot-password/reset` | Reset password with OTP |

### Singularity

| Route | Responsibility |
| --- | --- |
| `/api/singularity` | Main Singularity chat and agent endpoint |
| `/api/singularity/history` | List, create, update, and delete chat sessions |
| `/api/singularity/history/checkpoint` | Create, inspect, and execute rollbacks |

### Uploads

| Route | Responsibility |
| --- | --- |
| `/api/upload-blob` | Secure token-based direct uploads |
| `/api/upload-dc` | Secure server-side upload path |

### Marketing APIs

| Route | Responsibility |
| --- | --- |
| `/api/blog-dc` | Blog content |
| `/api/category` | Blog category management |
| `/api/contact-dc` | Contact form submission |
| `/api/testimonial` | Testimonial CRUD |
| `/api/auth-dc/login` | Marketing admin login |
| `/api/auth-dc/me` | Marketing admin auth check |

## 7. Core Libraries By Responsibility

| Folder/File Area | Responsibility |
| --- | --- |
| `lib/mongodb.ts` | Main agency models, DB connection, operational schemas |
| `lib/mongodb-tenant-models.ts` | Agency and super-admin tenant/platform schemas |
| `lib/mongodb-platform-models.ts` | System settings, logs, AI usage logs |
| `lib/mongodb-auth-models.ts` | OTP and rate limiting |
| `lib/mongodb-singularity-models.ts` | AI chat sessions and checkpoints |
| `lib/auth.ts` | Login, logout, session resolution, password helpers |
| `lib/auth-utils.ts` | JWT sign/verify |
| `lib/agency-context.ts` | Tenant resolution, plan limits, usage counters, trial/plan checks |
| `lib/validation.ts` | Input validation, sanitization, CSRF origin checks |
| `lib/storage.ts` | Hybrid Vercel Blob and Azure storage routing |
| `lib/upload-security.ts` | Upload validation and storage reservation helpers |
| `lib/brevo*.ts` | Transactional email system |
| `lib/ai-provider*.ts` | Provider abstraction and model calls |
| `lib/singularity-*.ts` | AI assistant routing, context, tools, history, rollback |
| `lib/chat.ts` | Messages, contacts, unread counts, presence |
| `lib/exportActions.ts` | Export/reporting data aggregation |

## 8. `lib/actions` Module Map

| Action Module | Responsibility |
| --- | --- |
| `access.ts` | Auth, role checks, AI access checks, scoped project access |
| `auth.ts` | Action-facing auth helpers |
| `dashboard.ts` | Dashboard metrics, charts, recent activity, notifications |
| `search.ts` | Global search across projects, clients, tasks, and users |
| `project-queries.ts` | Project reads and scoped project directory data |
| `project-mutations.ts` | Project creation and payment updates |
| `project-update-workflow.ts` | Project update orchestration and service syncing |
| `task-queries.ts` | Task reads and permissions |
| `task-mutations.ts` | Task CRUD, status changes, comments |
| `task-effects.ts` | Activity logs, notifications, emails, auto-complete logic |
| `service-queries.ts` | Service lookup and counts |
| `service-mutations.ts` | Service CRUD |
| `assets.ts` | Asset CRUD and AI enable toggling |
| `finance-queries.ts` | Finance summary, charts, invoices, payroll, refunds |
| `finance-mutations.ts` | Transactions, payroll, refunds, deletes |
| `finance-invoice-workflow.ts` | Invoice payment lifecycle and invoice creation |
| `client-queries.ts` | Client reads and client project access |
| `client-mutations.ts` | Client create, archive, restore, delete |
| `user-queries.ts` | Team member reads, tasks, activity, contribution history |
| `user-mutations.ts` | Team member create, update, document approvals, password reset |
| `user-lifecycle.ts` | Archive and restore user accounts |
| `leave.ts` | Leave request workflows |
| `agency-settings.ts` | Agency branding, email, AI, permission settings |
| `ai-runtime.ts` | Action-level AI entry points |
| `ai-task.ts` | Explain, enhance, and structure tasks with AI |
| `ai-task-chat.ts` | Task-level conversational AI |
| `ai-estimation.ts` | Task hour estimation |
| `singularity-chat.ts` | Non-agent Singularity response path |
| `super-admin.ts` | Super-admin public action surface |
| `super-admin-queries.ts` | Super-admin read models and analytics |
| `super-admin-ops.ts` | System settings, logs, newsletter, operational writes |

## 9. Component Families

| Component Family | Purpose |
| --- | --- |
| `components/layout/` | Authenticated shell, sidebar, topbar, profile modals |
| `components/dashboard/` | Dashboard cards, charts, lists, exports |
| `components/projects/` | Project wizard, board, tasks, assets, services, settings |
| `components/finance/` | Finance overview, filters, invoices, payroll, transactions |
| `components/team/` | Team cards, edit dialogs, document manager, contribution heatmap |
| `components/clients/` | Client cards and dialogs |
| `components/chat/` | Messages page, overlay, contacts, message bubbles |
| `components/settings/` | Agency settings sections |
| `components/singularity/` | AI assistant UI, attachments, history, checkpoints, tool panels |
| `components/super-admin/` | Platform admin shell and dashboards |
| `components/marketing/` | Public site sections and marketing admin pieces |
| `components/ui/` | Shared design-system primitives |

## 10. Context And Hooks

| File | Purpose |
| --- | --- |
| `context/TimezoneContext.tsx` | Localized date/time formatting and timezone detection |
| `context/CurrencyContext.tsx` | Currency symbol and amount formatting |
| `context/ChatContext.tsx` | Floating chat open/close state |
| `hooks/use-infinite-scroll.ts` | Progressive rendering and infinite scrolling |
| `hooks/use-active-polling.ts` | Timed polling helper |

## 11. Data Model Inventory

### Platform models

- `AgencyModel`
- `SuperAdminModel`
- `SystemSettingsModel`
- `SystemLogModel`
- `AIUsageLogModel`

### Auth and security models

- `OtpModel`
- `RateLimitModel`

### Agency operations models

- `UserModel`
- `ClientModel`
- `ProjectModel`
- `TaskModel`
- `ServiceModel`
- `AssetModel`
- `MessageModel`
- `NotificationModel`
- `ActivityModel`
- `LeaveRequestModel`
- `SettingsModel`

### Finance models

- `InvoiceModel`
- `TransactionModel`

### AI history models

- `SingularityChatSessionModel`
- `SingularityCheckpointModel`

## 12. Key Workflow Connections

| Trigger | Downstream Effects |
| --- | --- |
| Task status change | Activity log, notifications, optional emails, project auto-complete or reopen |
| Project status change | Notifications, optional client email, cache revalidation |
| Asset upload/delete | Storage provider operations, agency usage updates, activity log |
| Client marks invoice paid | Invoice moves to processing, admin notifications, pending-approval email |
| Admin approves invoice payment | Invoice update, income transaction creation, client notification and email |
| Leave request actions | Status changes, team notifications, leave emails |
| Singularity agent action | Tool execution, rollback snapshot capture, history persistence |

## 13. Scripts Directory

| Script Type | Files |
| --- | --- |
| Seeding and auth migration | `seed-accounts.js`, `migrate-passwords.js` |
| DB inspection and repair | `inspect-db.mjs`, `verify-db.mjs`, `fix-db.js`, `cleanup-db.mjs`, `import-db.js`, `export-db.js` |
| AI provider debugging | `test-live-*.mjs`, `test-flash-lite*.mjs` |
| Template/content utility | `create-email-templates.js` |

## 14. Fast Navigation Tips

- If you want UI entry points, start in `app/` and `components/`.
- If you want backend business logic, go straight to `lib/actions/`.
- If you want persistence, inspect `lib/mongodb*.ts`.
- If you want AI behavior, inspect `app/api/singularity/` plus `lib/singularity-*.ts` and `lib/actions/ai-*.ts`.
- If you want plan, usage, or tenant rules, inspect `lib/agency-context.ts`.
