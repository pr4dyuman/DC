<p align="center">
  <h1 align="center">🏢 Agency OS</h1>
  <p align="center">
    <strong>AI-Powered Agency Management Platform</strong><br/>
    Multi-tenant · Role-Based Access · Singularity AI Assistant · Real-time Chat
  </p>
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Account Types & Credentials](#account-types--credentials)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Feature Breakdown](#feature-breakdown)
  - [Dashboard](#1-dashboard)
  - [Global Search](#2-global-search)
  - [Notification Center](#3-notification-center)
  - [Profile & Account Management](#4-profile--account-management)
  - [Project Management](#5-project-management)
  - [Task Management (Kanban Board)](#6-task-management-kanban-board)
  - [Per-Task AI Features](#7-per-task-ai-features)
  - [Asset Management](#8-asset-management)
  - [Finance & Accounting](#9-finance--accounting)
  - [Team Management](#10-team-management)
  - [Client Management](#11-client-management)
  - [Messaging / Real-Time Chat](#12-messaging--real-time-chat)
  - [Leave Management](#13-leave-management)
  - [Settings & Configuration](#14-settings--configuration)
  - [Export & Reporting](#15-export--reporting)
  - [Super Admin Panel](#16-super-admin-panel)
- [Singularity AI Assistant](#singularity-ai-assistant)
- [Email Notifications (Brevo)](#email-notifications-brevo)
- [Security Features](#security-features)
- [Multi-Tenancy Architecture](#multi-tenancy-architecture)
- [Scripts & Utilities](#scripts--utilities)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

Agency OS is a full-stack, multi-tenant agency management platform built with **Next.js 16** and **MongoDB**. It provides an end-to-end solution for managing projects, tasks, clients, team members, finances, invoices, payroll, and more — all powered by **Singularity**, a Gemini-based AI assistant that can autonomously perform 25+ agency operations with full rollback support.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19, Server Actions) |
| **Language** | TypeScript |
| **Database** | MongoDB Atlas (via Mongoose ODM) |
| **AI Provider** | Google Gemini (`@google/genai` + `@google/generative-ai`) |
| **Auth** | JWT (`jose`) + bcrypt password hashing |
| **Styling** | Tailwind CSS v4 + Radix UI Primitives + Shadcn UI |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit (core + sortable + utilities) |
| **Email** | Brevo (Sendinblue) transactional emails |
| **Icons** | Lucide React |
| **Toasts** | Sonner |
| **Markdown** | react-markdown |
| **Date Utils** | date-fns |
| **Lazy Loading** | react-intersection-observer |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- Google Gemini API key (for AI features)
- Brevo API key (for email notifications)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/agency-os.git
cd agency-os

# Install dependencies
npm install

# Set up environment variables (see Environment Variables section)
cp .env.example .env

# Seed demo accounts (optional)
node scripts/seed-accounts.js

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Account Types & Credentials

Run `node scripts/seed-accounts.js` to create all demo accounts inside the `Digitalcorvids` agency.

| # | Role | Email | Password | Login Redirect |
|---|------|-------|----------|----------------|
| 1 | **Super Admin** | `superadmin@agencyos.com` | `Test@1234` | `/super-admin` |
| 2 | **Admin** | `admin@agencyos.com` | `Test@1234` | `/dashboard` |
| 3 | **Manager** | `manager@agencyos.com` | `Test@1234` | `/dashboard` |
| 4 | **Specialist** | `specialist@agencyos.com` | `Test@1234` | `/dashboard` |
| 5 | **Employee** | `employee@agencyos.com` | `Test@1234` | `/dashboard` |
| 6 | **Client** | `client@agencyos.com` | `Test@1234` | `/dashboard` |

---

## Role-Based Access Control (RBAC)

Agency OS uses a **three-tier authentication model**: `SuperAdminModel` (platform-level), `UserModel` (agency-level with roles), and `ClientModel` (external clients). Access enforcement is handled via `requireAuth()` and `requireRole()` guards on every server action.

### Super Admin (`superadmin`)
> **Platform-level** administrator. Manages agencies across the entire platform.

- ✅ Create, suspend, and delete agencies
- ✅ View billing, manage plans for all agencies
- ✅ Access cross-agency analytics and system logs
- ✅ Manage other super admin users
- ❌ Does **not** access individual agency dashboards

### Admin (`admin`)
> **Agency-level** administrator with full agency control.

- ✅ Full access to all agency features
- ✅ Create/edit/delete projects, tasks, clients, users
- ✅ Full financial access (transactions, invoices, payroll)
- ✅ Approve/reject leave requests
- ✅ Approve/reject document updates, invoice payments
- ✅ Reset passwords for any user in the agency
- ✅ Configure settings: branding, email, permissions, security
- ✅ Full Singularity AI access (all 25+ tools)
- ✅ Delete projects and transactions (requires password confirmation)
- ✅ Export reports (CSV)

### Manager (`manager`)
> Team lead with broad project and task management capabilities.

- ✅ View all projects and tasks
- ✅ Create projects (if permission granted)
- ✅ Create, assign, reassign, and update tasks
- ✅ Bulk create tasks and estimate hours via AI
- ✅ View finance stats (read-only)
- ✅ Approve/reject leave requests
- ✅ Manage clients (create, update)
- ✅ Create invoices and transactions
- ✅ Use Singularity AI (if permission granted)
- ❌ Cannot delete projects or manage agency settings
- ❌ Cannot update employee profiles or manage services

### Specialist (`specialist`)
> Skilled team member with focused task access.

- ✅ View projects and tasks assigned to them
- ✅ Update task status and details
- ✅ Comment on tasks
- ✅ View employee profiles
- ✅ Submit leave requests
- ✅ Use per-task AI chat
- ✅ Use Singularity AI (if permission granted)
- ❌ Cannot create projects or manage clients
- ❌ Cannot view financial data

### Employee (`employee`)
> Standard team member with basic task access.

- ✅ View assigned tasks on a personal task list
- ✅ Update task status (if `canMarkDone` permission is on)
- ✅ Comment on tasks
- ✅ Submit leave requests, upload personal documents
- ✅ View employee profiles
- ❌ Cannot create projects or tasks (unless permission granted)
- ❌ Cannot view financial data
- ❌ Limited AI access (configurable per user)

### Client (`client`)
> External client with a restricted, client-facing portal.

- ✅ View **their own** projects and tasks (read-only)
- ✅ View **their own** invoices and payment overview
- ✅ Mark invoices as "Paid" (sends to admin for approval)
- ✅ Create task requests on their projects
- ✅ View project assets and notifications
- ✅ Add comments on tasks
- ❌ Cannot view other clients, team members, or internal data
- ❌ Cannot access settings, finance, or admin features
- ❌ No sidebar link to Team, Clients, or Settings

### Configurable Permissions (Per User)

Admins can override individual user permissions via **Settings → Permissions**:

| Permission | Description | Default |
|-----------|-------------|---------|
| `canCreateProject` | Can create new projects | ❌ Off |
| `canManageTasks` | Can create and assign tasks | ✅ On |
| `canUseAI` | Can access Singularity AI | ❌ Off |
| `canMarkDone` | Can mark tasks as "Done" | ✅ On |
| `deleteAccess` | Delete scope: `none`, `own`, `any` | `own` |

---

## Feature Breakdown

### 1. Dashboard

**Route:** `/dashboard`

The dashboard is **role-adaptive** — it renders a completely different layout based on the logged-in user's role:

#### Admin/Manager Dashboard
- **Metric Cards** — Total projects, active tasks, revenue, pending invoices (animated counters)
- **Revenue Chart** — Monthly income vs. expense bar chart (Recharts)
- **Project Distribution** — Pie/donut chart of projects by status
- **Urgent Tasks List** — High-priority tasks with due dates and overdue indicators
- **Recent Activity Feed** — Timeline of team actions (task updates, project changes, etc.)
- **Export Report Button** — Download CSV reports with date range selection

#### Employee Dashboard
- **Personal Task List** — All tasks assigned to the employee, grouped by status (Todo / In Progress / Review / Done)
- Quick status-update actions on each task
- Overdue task highlighting

#### Client Dashboard
- **Project Overview** — Cards showing client's projects with completion stats
- **Task Overview** — Breakdown of tasks on client's projects
- **Financial Overview** — Invoice summary: paid, pending, overdue amounts
- **Assets Section** — Viewable/downloadable project assets
- **Notifications** — Client-specific notifications with links

### 2. Global Search

**Location:** Topbar (always visible, desktop only)

- **Debounced search** (300ms) across projects, tasks, clients, and users
- Results categorized with type-specific icons (briefcase, file, user, building)
- Click any result to navigate directly to its detail page
- Loading spinner during search
- Click-outside-to-close behavior

### 3. Notification Center

**Location:** Topbar bell icon

- **Real-time notification dropdown** with scrollable list
- Unread count badge (red dot indicator)
- Click-to-read marks individual notifications as read (optimistic update)
- Click notification to navigate to linked page
- Formatted timestamps in Indian locale format
- Notifications are generated for: task assignments, status changes, comments, leave, payments, etc.

### 4. Profile & Account Management

**Location:** Topbar avatar dropdown → Profile modal

- **Profile Tab:**
  - View/edit name, email, phone, address, company name
  - Upload avatar photo (base64 encoded)
  - View join date, last login, role, employment type
  - Relative "time ago" display for dates
- **Security Tab:**
  - Change password (requires current password)
  - Password validation: min 6 chars, uppercase, lowercase, number required
  - Show/hide password toggle
- **Topbar Dropdown Menu:**
  - My Profile link → Team profile page
  - Agency Branding link (admin only) → Settings
  - Settings link (non-client only)
  - Logout with session cleanup

### 5. Project Management

**Route:** `/dashboard/projects`, `/dashboard/projects/[slug]`

#### Project List Page
- Grid view with project cards showing:
  - Project name, client, status badge, completion percentage
  - Progress bar (colored by completion level)
  - Task breakdown counts (Todo/In Progress/Review/Done)
  - Created date, due date with overdue indicator

#### Create Project Wizard (4-step modal)
1. **Step 1 — Basics:** Project name, select/search client, budget (₹), due date
2. **Step 2 — Services:** Toggle services/categories from pre-configured list. These become the task categories for the Kanban board
3. **Step 3 — Payment Configuration:** Per-service payment setup:
   - **Installment billing:** Define custom installment amounts and due dates
   - **Monthly billing:** Set monthly amount
   - Auto-validation that installments equal total budget
4. **Step 4 — Summary & Confirm:** Review all details before creation

#### Project Detail Page (Tabs)
- **Board Tab** — Kanban board with drag-and-drop (see Task Management)
- **Assets Tab** — File/link management with upload and viewer (see Asset Management)
- **Payment Settings Tab** — Per-service payment schedules with installment tracking

#### Project Settings Modal (Gear icon)
- **General Tab:**
  - Rename project (updates slug automatically)
  - Change project status (Active / On Hold / Completed)
  - Change project slug
- **Client Tab:**
  - Assign/change client from existing client list with search
  - **Create New Client inline** (name, email, company — creates account and assigns)
  - Remove client assignment
- **AI Tab:**
  - Toggle project-level AI on/off
  - Per-asset AI context toggle (include/exclude assets from AI context)
  - AI status indicators
- **Danger Zone Tab:**
  - Delete project (requires password confirmation)
  - Permanent deletion warning

### 6. Task Management (Kanban Board)

**Route:** `/dashboard/projects/[slug]` → Board tab

#### Kanban Board
- **4 columns:** Todo → In Progress → Review → Done
- **Drag-and-drop** task cards between columns (`@dnd-kit` with custom collision detection)
- Column header with count badge
- Create task button per column

#### Create Task Modal
- Title, description (rich text)
- Assignee dropdown (searchable, with avatar previews)
- Category from project services
- Priority (Low / Medium / High) with color-coded badges
- Due date picker
- Estimated hours

#### Task Card
- Title, priority badge, category badge
- Assignee avatar with name
- Due date with countdown ("3d left" or "2d overdue")
- Estimated hours badge
- Comment count indicator
- Click to open detail view

#### View Task Modal (Full Detail)
- **Header:** Status badge, priority badge, category, estimated hours, overdue indicator
- **Metadata Grid (4-column):**
  - Assignee (avatar + name + job title)
  - Due date (formatted with remaining days / overdue warning)
  - Created date with creator name
  - Estimated hours with completion status
- **Description Section:** Full task description with whitespace preservation
- **Comments Thread:**
  - Chronological comment list with user avatars
  - "You" label for own comments (right-aligned, different color)
  - Timestamps formatted as "MMM d, h:mm a"
  - Optimistic comment posting (appears instantly)
  - Ctrl+Enter keyboard shortcut to post
- **Edit Button:** Opens edit modal (visible only if `canManageTasks` or own task)

#### Edit Task Modal
- All create fields + ability to change status
- Delete task option (with permission check)

### 7. Per-Task AI Features

Each task has three AI-powered features accessible from the Kanban board:

#### AI Chat Box (`AIChatBox.tsx`)
- **Persistent chat window** attached to a specific task
- AI has full context: project board state, all tasks, assignees, project assets
- Session persisted to database (survives page refreshes)
- **Legacy fallback** for non-Live models (sends full context + history each API call)
- Markdown rendering of responses

#### AI Explain (`AIExplanationModal.tsx`)
- One-click AI analysis of a task
- AI considers project context, board state, other tasks, and dependencies
- Generates a detailed explanation of what the task involves
- Helpful for onboarding or context-switching

#### AI Enhance Description
- AI rewrites/improves task descriptions
- Adds acceptance criteria, clearer formatting
- Preserves original intent while adding structure

#### AI Extract Fields
- Parses freeform text and extracts structured task fields
- Auto-fills: title, description, category (matched to available services), priority, estimated hours

### 8. Asset Management

**Route:** `/dashboard/projects/[slug]` → Assets tab

#### Asset Types
| Type | Description |
|------|-------------|
| `link` | External URL (GitHub, Figma, Notion, etc.) |
| `image` | Image file or URL (with preview) |
| `file` | Generic file (PDF, DOC, etc.) |
| `code` | Source code file (JS, TS, Python, JSON, etc.) |
| `folder` | Folder reference |
| `zip` | Archive file |

#### Add Asset Modal (Two Modes)
- **External Link mode:** URL, type selector (link/code/image), name, description
- **Secure Upload mode:**
  - Drag-and-drop or click to select file
  - **Security validation:**
    - Forbidden extension check (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.msi`, `.jar`, etc.)
    - 50MB file size limit
  - **Upload progress UI:**
    - Progress bar with percentage
    - Upload speed indicator (e.g., "2.4 MB/s")
    - Remaining time estimate
  - **Virus scan simulation:**
    - Post-upload security scan with loading animation
    - "Clean" / "Infected" result indicators
    - Auto-blocks infected files with error message
  - **Auto-type detection** based on file extension and MIME type
  - Base64 encoding for images, text content extraction for code/text files

#### Asset Card (`AssetCard.tsx`)
- Type-specific icon (image, code, link, file, folder, zip)
- Name, description, file size, upload date
- "Uploaded by" credit
- AI context toggle (checkmark when included in AI context)
- Click-to-view/open behavior
- Delete option

#### Asset Viewer Modal
- **Image viewer:** Full-size image preview (max-width/height responsive)
- **Code/text viewer:** Monospace text display with:
  - **Edit mode:** Full in-place text editing
  - **Save button:** Persists changes to database
  - Toast confirmations

### 9. Finance & Accounting

**Route:** `/dashboard/finance`

#### Finance Dashboard (`FinanceContent.tsx`)
Comprehensive financial management with multiple sections:

- **Total Balance Card** — Net position (income - expenses)
- **Stats Cards** — Total revenue, total expenses, net profit, pending invoices (with count)
- **Revenue Chart** — Monthly income/expense trends (Recharts bar/line chart)
- **Finance Filters** — Filter by: project, user, category, type, date range
- **Transaction List** — Sortable/filterable table with:
  - Date, description, type (income/expense), category, amount, status
  - Color-coded amounts (green for income, red for expenses)

#### Add Transaction Modal (Category-Aware)
Context-aware form that adapts UI based on selected category:

| Category | Type | Sub-fields |
|----------|------|------------|
| **Project** | Income | Select project |
| **Salary** | Expense | Select employee |
| **Freelancer** | Expense | Select project, team member |
| **Tax** | Expense | Tax sub-type: GST, TDS, Income Tax, Professional Tax |
| **Reimbursement** | Expense | Expense sub-type: Travel, Meals, Equipment, Software, Other |
| **Retainer** | Income | Select project |
| **Internal Transfer** | Either | Direction toggle (to/from member) |
| **Investor** | Income | — |
| **Refund** | Expense | Select project |
| **Other** | Either | — |

- Description, amount (₹), date-time picker
- Auto-description generation for transfers

#### Invoice Manager
- **Create Invoice:** Select project, amount, date
- **Invoice Workflow (4-stage):**
  ```
  Pending → Client marks as "Paid" → Processing → Admin Approves → Paid
                                                 → Admin Rejects → Pending (reverts)
  ```
- Status badges: `Pending` (yellow), `Processing` (blue), `Paid` (green), `Overdue` (red)
- Client-facing view: only sees their invoices with "Submit Payment" button
- Admin view: approve/reject buttons on "Processing" invoices

#### Payroll Manager (`PayrollManager.tsx`)
- Monthly view of all employees' salary status
- Employee name, role, salary amount
- "Paid" / "Unpaid" status per month
- One-click "Pay" button → creates Salary transaction and shows toast
- Current month auto-selected

#### Additional Finance Views
- **Project Finance Summary** — Per-project income vs. expense breakdown
- **Team Finance Summary** — Per-member salary and reimbursement history
- **Category-Member Summary** — Cross-tabulation of categories and members
- **Pending Payables List** — Outstanding payments needing attention

### 10. Team Management

**Route:** `/dashboard/team`, `/dashboard/team/[username]`

#### Team List Page
- Grid of team member cards with:
  - Avatar, name, role badge, job title
  - Email, phone
  - Employment type (Full-time / Part-time / Contract / Freelancer)
  - Online/offline status indicator

#### User Profile Page (`/dashboard/team/[username]`)
- **Profile Header:** Full user info — name, email, role, job title, salary, department, employment type, join date
- **Contribution Heatmap:**
  - GitHub-style yearly activity grid
  - Color intensity based on daily task completions
  - Tooltip showing exact date and completion count
  - 365-day rolling view
- **Task Breakdown:** Current tasks grouped by status with task cards
- **Document Manager:**
  - **Document types:** Aadhaar Card, PAN Card, Employment Contract, Other
  - **Upload flow:** Employee uploads → `pending` → Admin reviews → `approved` / `rejected`
  - Status badges and timestamps for each document
  - Admins see approve/reject buttons
  - Support for base64 image previews

#### User Administration
- **Edit User Dialog:** Update name, email, role, salary, job title, phone, address, employment type
- **Admin Password Reset:** Admin can reset any user's password (generates and shows new password)
- **Delete User:** Requires admin password confirmation, permanent deletion

### 11. Client Management

**Route:** `/dashboard/clients`, `/dashboard/clients/[username]`

#### Client List Page
- Client cards with: avatar/logo, company name, client name, email, phone
- "Add Client" button

#### Create Client Flow
- Name, email, company name, phone, address, logo upload
- **Auto-generates:** username, password, login credentials
- **Sends welcome email** with login details via Brevo
- Client can immediately log in with generated credentials

#### Client Profile Page
- Project list (projects assigned to this client)
- Task overview
- Financial history (invoices, payments)
- Activity log
- Document management (same as employees)

#### Archive/Unarchive
- Soft-delete clients (preserves all financial data and history)
- Archived clients hidden from default views

### 12. Messaging / Real-Time Chat

**Route:** `/dashboard/messages`

#### Chat System Components
- **Full Page Chat** (`/dashboard/messages`) — Conversation list + active chat
- **Chat Overlay** (`ChatOverlay.tsx`) — Floating mini-chat widget accessible from any page
- **Conversation List:** All contacts with:
  - Avatar, name, role badge
  - Last message preview + timestamp
  - Unread message count badge
- **Chat Messages:**
  - Text messages with timestamps
  - Image messages with preview
  - Sent/received alignment (left/right)
  - Auto-scroll to latest message

### 13. Leave Management

**Components:** `leave-request-dialog.tsx`, `leave-requests-list.tsx`

#### Submit Leave Request
- Leave type: `Casual` or `Emergency`
- Start date, end date
- Reason (text input)
- Submitted by: current user

#### Leave Request List
- Filterable by status: Pending / Approved / Rejected
- Each request shows: user name, type, dates, reason, status
- **Admin/Manager actions:**
  - Approve with optional message
  - Reject with optional reason
- **Email notifications** sent on: submission, approval, rejection

### 14. Settings & Configuration

**Route:** `/dashboard/settings`

| Tab | Description | Access |
|-----|-------------|--------|
| **Agency Branding** | System name, logo upload (base64), primary/secondary colors (CSS variable overrides for sidebar, accents) | Admin only |
| **Email Settings** | Global toggle for email notifications | Admin only |
| **Permissions** | Per-user permission overrides: `canCreateProject`, `canManageTasks`, `canUseAI`, `canMarkDone`, `deleteAccess` | Admin only |
| **Security** | Change own password (current password required, validation enforced) | All users |

Agency branding colors dynamically update:
- Sidebar background, text, hover, active, border colors
- These are applied via CSS custom properties throughout the app

### 15. Export & Reporting

**Component:** `ExportReportButton.tsx`

- **Date Range Selector** with quick presets:
  - This Month, Last Month, Last 3 Months, This Year
- **Export Types:**
  | Type | CSV Contents |
  |------|-------------|
  | **Summary** | Revenue, expenses, net profit, invoices breakdown, task/project metrics |
  | **Transactions** | Date, description, type, category, amount, status per row |
  | **Invoices** | Date, client ID, description, amount, status per row |
  | **Everything** | All three files downloaded at once |
- Generated CSV includes report header with date range and generation timestamp
- Validation: start date must be before end date
- Loading state with spinner during data fetch

### 16. Super Admin Panel

**Route:** `/super-admin`

A **completely separate interface** (different layout, different auth flow) for platform administrators:

| Page | Features |
|------|----------|
| **Dashboard** | Platform-wide analytics: total agencies, total users, total revenue, growth charts |
| **Agencies** | List all agencies with: name, plan, status, user count, created date. Actions: edit, suspend, delete |
| **Create Agency** | Name, slug (auto-generated), plan selection, billing email, AI config, welcome email toggle |
| **Agency Detail** | Edit agency details, change plan, view usage stats, manage limits |
| **Users** | List all super admin accounts |
| **Analytics** | Cross-agency reporting: revenue trends, user growth, plan distribution |
| **Billing** | Subscription management, plan pricing, payment history |
| **Logs** | System-wide audit logs, activity tracking |
| **Settings** | Platform-level global settings |

---

## Singularity AI Assistant

**Route:** `/dashboard/singularity`

Singularity is the AI brain of Agency OS — a Gemini-powered assistant with full awareness of agency data and the ability to perform real, live operations.

### Architecture

```
User Message → SingularityChat.tsx → API Route → Gemini Function Calling
                                                          ↓
                                                  singularity-tools.ts (executor)
                                                          ↓
                                              actions.ts (server actions)
                                                          ↓
                                                      MongoDB
```

### Two Modes

| Mode | Description |
|------|-------------|
| **Chat Mode** | Conversational AI using `gemini-2.0-flash-thinking-exp` with "thinking" display. Pure conversation — brainstorming, writing, Q&A |
| **Agent Mode** | Full tool-calling AI using `gemini-2.5-flash-preview-04-17`. Has live agency context, can execute 27+ tools. Shows tool actions with status |

### Session Management
- **Multi-session support:** Create, list, switch between, and delete chat sessions
- **Persistent history:** Messages saved to MongoDB (`SingularityChatSessionModel`)
- **Emergency save:** Uses `sendBeacon()` on `visibilitychange` to save even when tab is closed
- **Auto-title:** Sessions titled from first user message
- **Session sidebar:** List view with timestamps, message counts, mode badges

### Checkpoint & Rollback System
> Every action the AI takes is tracked with a before-snapshot. You can undo any action.

- **Automatic checkpoints** created after each set of tool actions
- **Undo button** on each checkpoint in the chat history
- **Rollback analysis:**
  - Classifies each action as "safe to rollback" or "conflicted"
  - Conflict detection: checks if entity was modified by someone else since the AI's change
  - Options: "Undo safe only" or "Undo all (force)"
- **Rollback actions:** Reverts creates (deletes entity), reverts updates (restores snapshot), reverts deletes (recreates entity)

### File Attachments
- Attach images and documents to messages
- **Image attachments:** Preview + base64 sent to AI for visual understanding
- **Document attachments:** Text extracted and sent as context
- **Support for:** Images (jpg, png, gif, webp), Documents (txt, md, csv, json, py, js, ts, etc.)
- Drag-and-drop or file picker
- Remove attachment before sending

### AI Context (`singularity-context.ts`)
The AI receives a rich, live system instruction containing:
- Current user info (name, role, ID)
- **Quick lookup tables:** Team name→ID, Project name→ID, Client name→ID
- **Task categories** from configured services
- **Project summaries** with task breakdowns and active task lists (up to 20 projects)
- **Client list** with company info
- **Team workload** per member: active tasks by status, current assignments
- **Finance snapshot:** Revenue, expenses, net profit, pending invoices
- **Recent activity** feed (last 8 events)
- Custom instructions for smart auto-assignment, due date estimation, and formatting rules

### Agent Mode Tools (27 tools)

#### Read Operations
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `search_agency` | All | Search across all agency data |
| `get_project_tasks` | All | View tasks grouped by Kanban column |
| `get_finance_summary` | Admin, Manager | Revenue, expenses, profit |
| `get_team_workload` | Admin, Manager | Per-member task distribution |
| `get_recent_activity` | Admin, Manager, Employee, Specialist | Activity feed |
| `get_task_comments` | All | View task comments thread |
| `get_transactions` | Admin, Manager | Query transactions with filters |
| `get_invoices` | Admin, Manager, Client | List invoices |
| `get_leave_requests` | Admin, Manager, Employee, Specialist | View leave requests |
| `get_employee_profile` | Admin, Manager, Employee, Specialist | Full user profile |

#### Task Actions
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `create_task` | Admin, Manager | Create with smart auto-assignment |
| `bulk_create_tasks` | Admin, Manager | AI Project Planner: 15-100+ tasks from a brief |
| `edit_task` | All (non-client) | Update title, description, priority, etc. |
| `update_task_status` | All (non-client) | Move between Kanban columns |
| `reassign_task` | Admin, Manager | Transfer task to different member |
| `delete_task` | Admin, Manager | Remove permanently |
| `add_task_comment` | All | Post comment on a task |
| `bulk_estimate_hours` | Admin, Manager | Auto-estimate hours for unestimated tasks |

#### Project Actions
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `create_project` | Admin, Manager | Create with name, budget, services, client |
| `update_project` | Admin, Manager | Edit name, budget, status, services |

#### Finance Actions
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `add_transaction` | Admin, Manager | Record income/expense |
| `bulk_add_transactions` | Admin, Manager | Import multiple transactions |
| `create_invoice` | Admin, Manager | Generate an invoice |

#### Client & Employee Management
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `create_client` | Admin, Manager | Add new client with company details |
| `update_client` | Admin, Manager | Edit client info |
| `update_employee` | Admin only | Change role, salary, job title |

#### Operations
| Tool | Allowed Roles | Description |
|------|---------------|-------------|
| `manage_leave_request` | Admin, Manager | Approve/reject leave |
| `add_service` | Admin only | Add service/department category |
| `update_service` | Admin only | Rename or reconfigure |

### Smart Behaviors

- **Auto-Assign Tasks** — When no assignee specified, assigns to team member with fewest active tasks (Todo + In Progress + Review). Never defaults to admin
- **Smart Due Dates** — Estimates based on complexity: 2 days (bug fix), 5 days (new feature), 10 days (major refactor). Adjusts for priority
- **AI Project Planner** — Given a brief, generates comprehensive task breakdown:
  - Phases: Planning → Design → Development → Testing → Deployment
  - 15-100+ tasks with detailed descriptions and acceptance criteria
  - Even distribution across team based on roles/skills and workload
  - Sequential due dates per assignee (parallel scheduling)
- **Response Formatting** — Never shows raw IDs; always uses human-readable names
- **Category Matching** — Auto-picks appropriate service category from available list

### Chat UI Features
- **Markdown rendering** with headings, bold, italic, code blocks, lists, tables
- **Thinking/reasoning display** — Expandable section showing AI's thought process
- **Copy to clipboard** — One-click copy on AI messages
- **Tool action indicators** — Shows calling/done/error status for each tool
- **Streaming responses** (where supported)
- **Chat suggestions** — Quick-start prompts for common actions
- **Mode switch** — Toggle between Chat and Agent modes mid-conversation
- **Clear chat / New session** — Reset current conversation

---

## Email Notifications (Brevo)

Transactional emails via **Brevo** (Sendinblue) for key events:

| Event | Recipient | Description |
|-------|-----------|-------------|
| Project Created | Admin, Client | New project alert |
| Project Status Changed | Team, Client | Status transitions |
| Project Completed | Client, Team | Celebration notification |
| Task Assigned | Assignee | New task with details |
| Task Status Changed | Assignee, Creator | Kanban status update |
| Task Comment Added | Task participants | New discussion comment |
| Invoice Created | Client | New invoice to review |
| Payment Pending Approval | Admin | Client submitted payment |
| Payment Approved | Client | Admin confirmed payment |
| Payment Rejected | Client | Payment bounced/rejected |
| Leave Submitted | Admin | New leave request |
| Leave Approved | Employee | Leave approved |
| Leave Rejected | Employee | Leave rejected with reason |
| Salary Paid | Employee | Salary payment confirmation |
| Refund Issued | Client | Refund processed |
| Document Update Request | Admin | Employee uploaded new documents |
| Document Response | Employee | Admin approved/rejected documents |
| Client Account Created | Client | Welcome email with login credentials |
| Employee Account Created | Employee | Welcome email with login credentials |

Global toggle: **Settings → Email Settings** enables/disables all emails.

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with salt rounds |
| **JWT Authentication** | Signed with HMAC-SHA256, stored in HTTP-only cookies |
| **Session Management** | `AuthSession` includes `userId`, `role`, `agencyId` |
| **Role-Based Access** | `requireAuth()` and `requireRole()` guards on all server actions |
| **AI Tool Permissions** | Per-tool role matrix in `singularity-tools.ts` |
| **AI Key Encryption** | AES-256-GCM for storing API keys in database |
| **Password Validation** | Min 6 chars, uppercase, lowercase, number required |
| **Delete Confirmation** | Critical deletes (projects, transactions, users) require password re-entry |
| **Asset Upload Security** | Forbidden extension blocklist, 50MB size limit, virus scan |
| **Multi-Tenancy Isolation** | All queries scoped by `agencyId` via `getCurrentAgency()` |
| **RBAC on Server** | Every mutation checks caller role before execution |

---

## Multi-Tenancy Architecture

Built with full multi-tenancy from the ground up:

- Each agency is an isolated tenant with its own data
- All models (Users, Projects, Tasks, etc.) have an `agencyId` field
- Queries automatically scoped to the current agency via `getCurrentAgency()`
- Super Admins operate above the agency level
- Agency plans control feature limits:

| Plan | Users | Projects | Clients | Storage | AI | Custom Branding |
|------|-------|----------|---------|---------|----|----|
| **Free** | 3 | 5 | 10 | 100 MB | ❌ | ❌ |
| **Starter** | 10 | 50 | 100 | 1 GB | ✅ | ❌ |
| **Pro** | 50 | 500 | 1000 | 10 GB | ✅ | ✅ |
| **Enterprise** | ∞ | ∞ | ∞ | ∞ | ✅ | ✅ |

---

## Scripts & Utilities

| Script | Description |
|--------|-------------|
| `scripts/seed-accounts.js` | Create demo accounts for all 6 roles in `Digitalcorvids` agency |
| `scripts/check-db.js` | Verify MongoDB connection, inspect collections and counts |
| `scripts/export-db.js` | Export full database to JSON backup files |
| `scripts/import-db.js` | Import database from JSON backup |
| `scripts/fix-db.js` | Database migration and fix utilities |
| `scripts/create-email-templates.js` | Initialize Brevo email templates |
| `check-env.js` | Validate all environment variables are set |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT token signing (HMAC-SHA256) | ✅ |
| `BREVO_API_KEY` | Brevo (Sendinblue) API key for transactional emails | ✅ |
| `BREVO_SENDER_EMAIL` | Sender email address for notifications | ✅ |
| `BREVO_SENDER_NAME` | Sender display name | ✅ |
| `AI_ENCRYPT_KEY` | AES-256-GCM key for encrypting AI API keys in DB (32-byte hex) | ✅ |

---

## Project Structure

```
agency-os/
├── app/                              # Next.js App Router
│   ├── api/                          # API routes (chat, sessions, save, rollback)
│   ├── dashboard/                    # Main dashboard pages
│   │   ├── clients/                  # Client management
│   │   │   └── [username]/           # Client profile page
│   │   ├── finance/                  # Finance & accounting
│   │   ├── messages/                 # Real-time chat
│   │   ├── projects/                 # Project management
│   │   │   └── [slug]/              # Project detail (Kanban, Assets, Settings)
│   │   ├── settings/                 # Agency settings
│   │   ├── singularity/              # Singularity AI assistant
│   │   └── team/                     # Team management
│   │       └── [username]/           # User profile page
│   ├── login/                        # Auth page
│   └── super-admin/                  # Super admin panel
│       ├── agencies/                 # Agency CRUD
│       │   ├── new/                  # Create agency wizard
│       │   └── [id]/                # Agency detail/edit
│       ├── analytics/                # Cross-agency analytics
│       ├── billing/                  # Subscription billing
│       ├── logs/                     # System audit logs
│       ├── settings/                 # Platform settings
│       └── users/                    # Super admin user management
│
├── components/                       # React components (93 files)
│   ├── chat/                         # ChatComponents, ChatOverlay
│   ├── clients/                      # ClientCard, EditClientDialog
│   ├── dashboard/                    # DashboardContent, Charts, MetricCard,
│   │                                   # ClientDashboard (5 sub-components),
│   │                                   # EmployeeTasksList, ExportReportButton,
│   │                                   # RecentActivity, UrgentTasksList
│   ├── finance/                      # FinanceContent, AddTransactionModal,
│   │                                   # InvoiceManager, PayrollManager,
│   │                                   # RevenueChart, StatsCards, TotalBalance,
│   │                                   # TransactionList, FinanceFilters,
│   │                                   # ProjectFinanceSummary, TeamFinanceSummary,
│   │                                   # CategoryMemberSummary, PendingPayablesList
│   ├── layout/                       # AuthenticatedLayout, Sidebar, MobileSidebar,
│   │                                   # Topbar, ProfileModal, LayoutSkeleton
│   ├── projects/                     # KanbanBoard, CreateProjectWizard,
│   │                                   # CreateTaskModal, EditTaskModal,
│   │                                   # ViewTaskModal, ProjectView,
│   │                                   # ProjectSettingsModal, DroppableColumn,
│   │                                   # TaskCard, AIChatBox, AIExplanationModal,
│   │                                   # AddAssetModal, AssetCard, AssetList,
│   │                                   # AssetViewerModal, PaymentSettingsCard
│   ├── settings/                     # Tab components for settings page
│   ├── singularity/                  # SingularityChat (1769 lines, 110KB)
│   ├── super-admin/                  # Super admin layout and UI components
│   ├── team/                         # TeamProfile, ContributionHeatmap,
│   │                                   # DocumentManager, EditUserDialog
│   └── ui/                           # Shadcn/Radix primitives (Avatar, Badge,
│                                       # Button, Card, Dialog, Dropdown, Input,
│                                       # Label, ScrollArea, Select, Tabs,
│                                       # Textarea, Tooltip, Progress, DateTimeInput)
│
├── lib/                              # Core logic
│   ├── actions.ts                    # Server actions (3623 lines, 131 functions)
│   ├── auth.ts                       # Login, logout, session, password hashing
│   ├── auth-utils.ts                 # JWT sign/verify, AuthSession type
│   ├── db.ts                         # Database access layer with mutex locking
│   ├── mongodb.ts                    # Mongoose schemas & 15+ models
│   ├── types.ts                      # TypeScript type definitions (397 lines)
│   ├── singularity-context.ts        # AI system instruction builder (254 lines)
│   ├── singularity-tool-defs.ts      # AI tool declarations (27 tools, 504 lines)
│   ├── singularity-tools.ts          # AI tool executor with RBAC (981 lines)
│   ├── singularity-history.ts        # AI chat session persistence
│   ├── ai-provider.ts               # Multi-provider AI configuration
│   ├── ai-models.ts                  # AI model definitions
│   ├── brevo-mail.ts                 # Email notification service
│   ├── agency-context.ts             # Multi-tenancy context resolver
│   ├── live-session.ts               # WebSocket live AI sessions
│   ├── exportActions.ts              # CSV export data fetching
│   └── utils.ts                      # Utility functions (cn, formatters)
│
├── context/                          # React context providers
├── hooks/                            # Custom React hooks
├── scripts/                          # CLI utility scripts
└── public/                           # Static assets
```

---

## License

Private — All rights reserved.
