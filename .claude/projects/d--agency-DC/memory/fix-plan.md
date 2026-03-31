# AI Blogger Fix Implementation Plan

## STEP-BY-STEP FIX SEQUENCE

### PHASE 1: CRITICAL FIXES (Race Conditions & Security)

#### Step 1.1: Fix Publishing Race Condition (CRITICAL)
- File: `lib/actions/ai-blogger.ts:8011-8207`
- Function: `publishBlogStudioPostImpl`
- Issue: No transaction, concurrent calls create duplicates
- Action: Wrap in transaction, re-check status before publish
- Estimated: 2-3 hours

#### Step 1.2: Fix Schedule Double-Booking (CRITICAL)
- File: `lib/actions/ai-blogger.ts:8712-8733`
- Function: `claimBlogStudioScheduleLock`
- Issue: Lock not properly validated, multiple runners can claim
- Action: Check nModified === 1, add proper atomic verification
- Estimated: 1-2 hours

#### Step 1.3: Fix NoSQL Injection in Search (CRITICAL - Security)
- File: `lib/actions/super-admin-blog-management.ts:46-51`
- Function: `getBlogStudioPostsPageImpl`
- Issue: User input directly to $regex
- Action: Escape regex patterns before use
- Estimated: 30 mins - 1 hour

### PHASE 2: HIGH PRIORITY FIXES

#### Step 2.1: Wrap JSON.parse in Error Handling
- Files: lib/actions/ai-blogger.ts (multiple locations)
- Issue: No try-catch around JSON.parse
- Action: Add try-catch to all JSON.parse calls
- Estimated: 1-2 hours

#### Step 2.2: Fix Pagination Validation
- File: lib/actions/super-admin-blog-management.ts:76-84
- Issue: Division by zero, negative page, unbounded queries
- Action: Add validation before any math operations
- Estimated: 1 hour

#### Step 2.3: Implement Webhook Delivery Logging
- File: lib/ai-blogger-webhook.ts:272-310
- Issue: No MongoDB persistence, getWebhookDeliveryLogs always returns []
- Action: Create schema and implement save/retrieve
- Estimated: 2-3 hours

#### Step 2.4: Make Webhook Failures Blocking
- File: lib/actions/ai-blogger.ts:8280-8283
- Issue: Webhook failure doesn't fail publish
- Action: Change to blocking or add critical alert
- Estimated: 1-2 hours

### PHASE 3: MEDIUM PRIORITY FIXES

#### Step 3.1: Add Transaction Support to Publishing
- Consolidate multiple database operations

#### Step 3.2: Replace Record<string, unknown> with Proper Types
- Multiple files

#### Step 3.3: Add Type Guards for Unknown Parameters
- lib/ai-blogger-serp-analysis.ts

---

## FUNCTION ANALYSIS FOR CONSOLIDATION

### Publishing Workflow Functions
1. `publishBlogStudioPostImpl` (line 8011)
2. `updateBlogStudioPostStatusImpl` (line 6586)
3. Any others?

**Analysis Needed:**
- updateBlogStudioPostStatusImpl - what statuses does it handle?
- publishBlogStudioPostImpl - specific to "Published" status?
- Should consolidate if publishing IS status update?

### Scheduling Functions
1. `runDueBlogStudioSchedulesImpl`
2. `claimBlogStudioScheduleLock`
3. `releaseBlogStudioScheduleLock`

**Analysis Needed:**
- Are these properly coordinated?
- Is release actually called?
- Any orphaned locks?

---

## STARTING POINT

Begin with Step 1.3 (fastest security fix) while preparing for 1.1 and 1.2
