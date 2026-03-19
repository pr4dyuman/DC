# Mindmap Docs

This folder documents the current `agency-os` codebase as of `2026-03-19`.

## What Is Here

- `features-and-working.md`
  Covers the product features and how each major area works end to end.
- `route-and-module-map.md`
  Maps route groups, API surfaces, folders, and backend modules.
- `whole-project-mindmap.md`
  Mermaid diagrams for a high-level project mind map and architecture flow.

## Repo Snapshot

| Metric | Current Snapshot |
| --- | --- |
| Framework | Next.js 16 App Router |
| Main language | TypeScript with some JS/JSX marketing modules |
| Page files | 41 |
| API route files | 15 |
| UI components | 215 |
| Action/service modules in `lib/actions` | 42 |
| Core app/library files in `lib` | 111 |
| Utility scripts | 18 |
| Exported Mongoose models | 22 |

## Product Areas Covered

- Public marketing website
- Agency signup, login, password reset, and auth
- Agency dashboard shell
- Projects, tasks, services, assets, and payments
- Finance, invoices, payroll, refunds, and reporting
- Team management, employee profiles, leave flows, and document handling
- Client management and client portal views
- Real-time-style internal messaging and chat overlay
- Singularity AI chat, agent mode, task AI, history, checkpoints, and rollback
- Super-admin platform management, billing, analytics, logs, and global settings
- Storage, email, MongoDB tenancy, security, and scripts

## Main Building Blocks

| Layer | Main Responsibility |
| --- | --- |
| `app/` | Routes, layouts, and API endpoints |
| `components/` | UI for marketing, dashboard, finance, projects, chat, team, and super-admin |
| `lib/actions/` | Server actions and workflow orchestration |
| `lib/` | Auth, MongoDB, AI providers, storage, email, validation, export, and shared helpers |
| `context/` | Timezone, currency, and chat overlay state |
| `hooks/` | Progressive loading and polling helpers |
| `models/marketing/` | Marketing CMS models |
| `scripts/` | Seeding, DB maintenance, data migration, and AI/debug utilities |

## Core Data Entities

- Platform: `Agency`, `SuperAdmin`, `SystemSettings`, `SystemLog`, `AIUsageLog`
- Auth and security: `Otp`, `RateLimit`
- Agency operations: `User`, `Client`, `Project`, `Task`, `Service`, `Asset`
- Finance: `Invoice`, `Transaction`
- Collaboration: `Message`, `Notification`, `Activity`, `LeaveRequest`
- AI history: `SingularityChatSession`, `SingularityCheckpoint`

## Reading Order

1. Start with `features-and-working.md` for the business view.
2. Open `route-and-module-map.md` for the code navigation view.
3. Use `whole-project-mindmap.md` when you want a quick visual summary.
