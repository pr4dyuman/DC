# AI Blogger Webhook System Implementation Plan

**Date**: 2026-03-30
**Phase**: Architecture Cleanup + Webhook Integration
**Status**: Ready to implement

---

## Overview

Transition AI Blogger from DC-specific publishing to agency-agnostic webhook system. Enable multiple agencies/sites to publish blogs independently using the same AI Blogger platform.

---

## Phase 1: Settings Cleanup (Clean Up DC-Oriented Settings) - 3-4 hours

### Current Issues (DC-Specific Hardcoding)

**File**: `/components/ai-blogger/AIBloggerSettingsWorkspace.tsx`

1. **Line 661, 910**: Target Type has hardcoded options
   ```typescript
   <SelectItem value="agency-blog">Manual Export</SelectItem>
   <SelectItem value="dc-marketing-blog">Connected Blog</SelectItem>
   ```
   - ❌ "dc-marketing-blog" is hardcoded
   - ❌ "Connected Blog" implies connection to DC only

2. **Line 699-701**: Hardcoded DC message
   ```typescript
   {defaultTargetType === "dc-marketing-blog"
       ? "Connected Blog is the only direct publish target today."
       : "Manual Export keeps drafts..."}
   ```
   - ❌ Says DC is only option
   - ❌ Not scalable for multiple agencies

3. **Line 114-122**: Website source hints mention nothing about webhooks
   - Missing webhook configuration guidance

### Files to Update

| File | Changes | Lines | Effort |
|------|---------|-------|--------|
| `/lib/types-ai-blogger.ts` | Add webhookUrl to BlogStudioTarget, add webhook settings type | 27, 60-64, 410-415 | 1h |
| `/lib/mongodb-blog-studio-models.ts` | Add webhookUrl & webhook settings schema | Schema def | 1h |
| `/components/ai-blogger/AIBloggerSettingsWorkspace.tsx` | Remove hardcoded "dc-marketing-blog", add webhook section | 661, 699-701, 710, 910 | 1.5h |
| `/app/dashboard/ai-blogger/settings/page.tsx` | No changes needed (uses component) | N/A | 0h |

### What Should Be There Instead

**Target Types** (generic):
```typescript
type BlogStudioTargetType = "webhook" | "manual-export";
```

**Publishing Settings** (new):
```typescript
type BlogStudioWebhookConfig = {
    url: string;           // https://yoursite.com/api/blog/webhook
    active: boolean;       // toggle on/off
    retryAttempts: number; // 1-5
    timeout: number;       // 5-30 seconds
};

extend BlogStudioTarget:
{
    type: "webhook" | "manual-export",
    label: string,
    webhookConfig?: BlogStudioWebhookConfig,
    webhookLastSent?: string,
    webhookLastStatus?: "success" | "failed",
}
```

### Settings UI Changes

Current (DC-oriented):
```
Publishing Defaults
├── Default Target Type: [dropdown: Manual Export | Connected Blog]
├── Default Target Label: [input]
└── Message: "Connected Blog is only option today"
```

New (Webhook-aware):
```
Publishing Defaults
├── Default Target Type: [dropdown: Webhook | Manual Export]
├── Default Target Label: [input]
└── If selected "Webhook":
    ├── Webhook URL: [textarea URL]
    ├── Active: [toggle]
    ├── Retry Attempts: [slider 1-5]
    ├── Timeout: [slider 5-30s]
    └── Test Webhook [button]
    └── Last Status: Success/Failed [badge]
```

---

## Phase 2: Webhook Service Implementation - 2-3 hours

### New Files to Create

**File**: `/lib/ai-blogger-webhook.ts` (180 lines)

```typescript
export type WebhookPayload = {
    event: "blog.published" | "blog.updated" | "blog.deleted";
    blog: {
        id: string;
        title: string;
        slug: string;
        content: string;
        excerpt: string;
        metaTitle: string;
        metaDescription: string;
        canonicalUrl: string;
        image: string;
        imageAlt: string;
        schemaMarkup: string;
        category: string;
        internalLinks: Array<...>;
        contentClusterId?: string;
        parentTopicSlug?: string;
        publishedAt: string;
    };
    source: {
        agencyId: string;
        agencyName: string;
        publishedAt: string;
    };
};

export async function sendWebhookToAgency(
    webhookConfig: BlogStudioWebhookConfig,
    payload: WebhookPayload,
    retryCount: number = 0
): Promise<{ success: boolean; error?: string; statusCode?: number }>;

export async function logWebhookDelivery(
    agencyId: string,
    webhookUrl: string,
    result: WebhookResult
): Promise<void>;

export type WebhookResult = {
    success: boolean;
    statusCode?: number;
    responseTime: number;
    error?: string;
    timestamp: string;
};

export async function getWebhookDeliveryLogs(
    agencyId: string,
    limit: number = 50
): Promise<WebhookResult[]>;
```

**Features:**
- ✅ Retry logic (exponential backoff, 3 attempts max)
- ✅ Timeout handling (5-30 seconds)
- ✅ Error logging
- ✅ Delivery status tracking
- ✅ Webhook signature verification (HMAC optional)

---

## Phase 3: Integration in Publish Flow - 2 hours

### File: `/lib/actions/ai-blogger.ts`

**Function**: `publishBlogStudioPostImpl()` (around line 8017-8080)

**Change**: After creating blog, send webhook

```typescript
// Current (lines 8017-8035)
const marketingPost = await MarketingBlog.create({...});

// Add NEW (after publish)
if (currentPost.publishingTarget.type === "webhook") {
    await sendWebhookToAgency(
        currentPost.publishingTarget.webhookConfig,
        buildWebhookPayload(marketingPost),
        0 // retry count
    );

    // Log attempt but don't fail publish if webhook fails
    blogLogStep("PUBLISH", "Webhook delivered", {
        webhookUrl: currentPost.publishingTarget.webhookConfig.url,
        statusCode: result.statusCode,
    });
}
```

---

## Phase 4: Agency Webhook Endpoint (Receiver) - 2-3 hours

### New File: `/app/api/blogs/webhook/route.ts`

```typescript
// POST /api/blogs/webhook
// Receives published blogs from AI Blogger

export async function POST(req: Request) {
    const payload: WebhookPayload = await req.json();

    // Verify signature (HMAC)
    // Store blog in local database
    // Return 200 OK or error
}
```

**What it does:**
1. Validates webhook signature
2. Creates/updates blog in agency's database
3. Triggers ISR revalidation
4. Returns success/failure

---

## Phase 5: Super-Admin Blog Manager - 4-6 hours

### New Directory: `/app/super-admin/blogs/`

```
/app/super-admin/blogs/
├── page.tsx (all blogs overview)
├── [agencyId]/
│   ├── page.tsx (agency's blogs)
│   ├── [blogId]/
│   │   ├── page.tsx (blog detail)
│   │   └── edit/page.tsx (edit form)
│   └── webhooks.tsx (delivery logs)
```

**Features:**
- [x] List all blogs (filter by agency, status, date)
- [x] Search blogs by title/slug
- [x] Quick edit (title, description, status)
- [x] Delete blog
- [x] View live link
- [x] Webhook delivery status
- [x] Manual retry webhook
- [x] See who published (user, date)
- [x] Bulk actions (delete multiple)

---

## Phase 6: Testing & Documentation - 2-3 hours

### Tests
- [ ] Test webhook delivery success
- [ ] Test webhook delivery failure + retry
- [ ] Test timeout handling
- [ ] Test blog appears on DC website
- [ ] Test multiple agencies (if available)
- [ ] Test signature verification

### Documentation
- [x] Webhook API spec (payload format)
- [x] Setup guide for agencies
- [x] Example webhook receiver code
- [x] Troubleshooting guide
- [x] Retry/timeout behavior

---

## Implementation Order (Recommended)

1. **Phase 1** (3-4h): Clean up settings
   - Makes system agency-agnostic
   - Foundation for webhook config

2. **Phase 2** (2-3h): Webhook service
   - Reusable, testable
   - Can test independently

3. **Phase 3** (2h): Integration in publish
   - Connects the pieces
   - First end-to-end flow

4. **Phase 4** (2-3h): Webhook receiver
   - Can be tested with Phase 2+3
   - DC website gets blogs

5. **Phase 5** (4-6h): Super-admin manager
   - UI for oversight
   - Can monitor webhook status

6. **Phase 6** (2-3h): Testing & Docs
   - Verify everything works
   - Write guides

---

## Total Effort

| Phase | Time | Status |
|-------|------|--------|
| Phase 1: Settings Cleanup | 3-4h | Ready |
| Phase 2: Webhook Service | 2-3h | Ready |
| Phase 3: Integration | 2h | Ready |
| Phase 4: Receiver Endpoint | 2-3h | Ready |
| Phase 5: Super-Admin Manager | 4-6h | Ready |
| Phase 6: Testing & Docs | 2-3h | Ready |
| **TOTAL** | **~17-22h** | Ready |

---

## Key Files to Modify/Create

### Create (New Files)
- [ ] `/lib/ai-blogger-webhook.ts` - Webhook service
- [ ] `/app/api/blogs/webhook/route.ts` - Receiver endpoint
- [ ] `/app/super-admin/blogs/page.tsx` - Blog overview
- [ ] `/app/super-admin/blogs/[agencyId]/page.tsx` - Agency blogs
- [ ] `/components/super-admin/BlogManagerTable.tsx` - Blog table
- [ ] `/components/super-admin/WebhookStatusBadge.tsx` - Status indicator

### Modify (Existing Files)
- [ ] `/lib/types-ai-blogger.ts` - Add webhook types
- [ ] `/lib/mongodb-blog-studio-models.ts` - Add webhook schema
- [ ] `/components/ai-blogger/AIBloggerSettingsWorkspace.tsx` - Remove DC hardcoding, add webhook section
- [ ] `/lib/actions/ai-blogger.ts` - Integrate webhook sending on publish
- [ ] `/lib/email-constants.ts` - (no changes needed)

---

## DC-Specific Code to Remove

1. ❌ "dc-marketing-blog" target type
2. ❌ "Connected Blog is only option" message
3. ❌ Hard references to DC database in publishing logic
4. ❌ Any mentions of DC-specific workflow

---

## Benefits of This Architecture

✅ **Agency-Agnostic**: Works for any agency/site
✅ **Scalable**: Each agency independent
✅ **Reliable**: Webhook retry + error handling
✅ **Observable**: Super-admin oversight
✅ **Flexible**: Manual export still works
✅ **Decoupled**: No shared database required

---

## Questions & Decisions

1. **Webhook Signature**: Should we use HMAC-SHA256?
   - Recommended: YES (security)

2. **Retry Policy**: How many retries?
   - Recommended: 3 attempts, exponential backoff (5s, 25s, 125s)

3. **Timeout**: How long to wait for webhook response?
   - Recommended: 10 seconds (user configurable 5-30s)

4. **Storage**: Store webhook logs where?
   - Recommended: New collection `BlogWebhookDeliveryLogs`

---

## Start With Phase 1?

Begin with **Phase 1: Settings Cleanup** to make the system generic before adding webhook logic.

This removes all DC coupling and prepares for multi-agency support.
