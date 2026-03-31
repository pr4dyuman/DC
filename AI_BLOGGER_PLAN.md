# AI Blogger Plan

## Goal

Build `AI Blogger` as a native DC dashboard module instead of merging the old `blog-ai-studio` runtime.

Core product direction:

- Keep one DC auth system.
- Keep one DC dashboard shell.
- Show `AI Blogger` in the main sidebar under `Singularity`.
- Treat it as a premium DC module for eligible plans, not a trial feature.
- Use the old `blog-ai-studio` project only as workflow/UI reference.

## Access Rules

Current rollout rule:

- `AI Blogger` appears in the sidebar for admins only.
- It stays locked for:
  - trial agencies
  - free and starter agencies
  - inactive agencies
- It stays hidden for clients.

Default behavior:

- `free` plan: disabled
- `starter` plan: disabled
- `pro` and `enterprise`: enabled
- `trial` status: still locked even if the plan is `pro`

## Native Module Structure

Routes:

- `/dashboard/ai-blogger`
- `/dashboard/ai-blogger/generate`
- `/dashboard/ai-blogger/posts`
- `/dashboard/ai-blogger/posts/[slug]`
- `/dashboard/ai-blogger/settings`

Shared dashboard behavior:

- Keep the existing sidebar and topbar.
- Reuse DC cards, badges, tables, spacing, and typography.
- Do not mount a second app shell or Vite router inside DC.

## What Goes In V1

### 1. Dashboard shell and access gate

- Sidebar entry
- Locked-state page
- Shared module header and sub-navigation
- Internal-only dashboard pages

### 2. Core editorial workflow

- Overview page
- Generate page
- Posts queue
- Post detail page
- Settings blueprint page

### 3. Backend foundation

- Mongo models for briefs, drafts, schedules, and settings
- Agency scoping on every record
- DC-native AI provider usage
- Draft-first workflow with approval checkpoints

### 4. DC internal dogfooding

- Run AI Blogger for DC's own blog first
- Generate drafts into the DC editorial flow
- Keep public publishing approval-based until quality is proven

## What Stays Out Of V1

- Separate AI Blogger signup/login
- Separate wallet/credits UI
- Separate public SaaS runtime
- Auto-publish directly to production blogs
- Duplicate AI wrappers or settings systems
- Fancy analytics before real usage data exists
- Rebuilding the old admin screens from `blog-ai-studio`

## Recommended Build Order

### Phase 1

- Add sidebar entry and lock state
- Add native dashboard pages
- Finalize IA and module navigation

### Phase 2

- Add Mongo schemas:
  - `BlogStudioPost`
  - `BlogStudioRun`
  - `BlogStudioSettings`
  - `BlogStudioSchedule`
- Add agency-scoped actions

### Phase 3

- Wire generation flow:
  - brief intake
  - topic shaping
  - SEO review
  - draft creation
  - approval state transitions

### Phase 4

- Connect publishing handoff to the existing DC blog pipeline
- Add DC-only cron generation for draft creation

### Phase 5

- Add real enablement flow for paid agencies
- Add billing/add-on management only after the workflow is stable

## UI Guidelines

- Match existing DC dashboard UI, not the old glassmorphism app.
- Keep layouts practical and editorial, not flashy.
- Favor clear queues, statuses, and actions over decorative widgets.
- Keep cards dense enough for real production use.

## Immediate Next Steps

1. Build draft creation and post status transitions.
2. Add editable settings and schedule forms on top of the new Mongo layer.
3. Connect approved content to the current DC blog publishing flow.
4. Add DC-only cron generation for draft creation.
