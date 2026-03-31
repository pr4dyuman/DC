# 🔴 AI BLOGGER - COMPREHENSIVE HARDCODING AUDIT

**Date:** 2026-03-31
**Status:** ❌ CRITICAL - Many hardcoded company/user/website-specific references found
**Severity:** HIGH - System is NOT generic for all users/websites

---

## CRITICAL ISSUES (MUST FIX)

### 1. 🔴 INTERNAL LINKS - COMPLETELY HARDCODED TO ONE COMPANY (`lib/ai-blogger-internal-links.ts`)

**Problem:** Entire internal link database is hardcoded to Digital Corvids/DC website structure

**Lines 51-178:** `DC_STATIC_LINK_CANDIDATES` array with 13 hardcoded links:
```typescript
// HARDCODED DC SPECIFIC LINKS:
{
  title: "Digital Corvids Home",
  href: "/",
  suggestedAnchor: "Digital Corvids",
  keywords: ["...digitalcordvids..."]
}
{
  title: "About Digital Corvids",
  href: "/about",
  suggestedAnchor: "about Digital Corvids",
}
// Service paths ALL hardcoded to /services/*:
  - "/services/web-development"
  - "/services/seo"
  - "/services/social-media-marketing"
  - "/services/video-production-ad"
  - "/services/ppc"
  - "/services/influencer-marketing"
  - "/services/manage-company"
  - "/services/ai-blogger"
```

**Line 201:** Hardcoded domain validation:
```typescript
if (href.includes("digitalcorvids.com")) { ... }
```

**Impact:**
- ❌ Works ONLY for Digital Corvids
- ❌ Other users get NO internal link suggestions
- ❌ Can't handle custom service structures
- ❌ Can't handle different domain names

**Fix:** Make internal links configurable per agency/user

---

### 2. 🔴 PUBLISHING TARGET HARDCODING - MULTIPLE FILES

#### A. `lib/ai-blogger-presentation.ts` (Lines 38-39)
```typescript
"dc-marketing-blog": "Connected Blog",
"agency-blog": "Manual Export",
```

#### B. `components/ai-blogger/AIBloggerDraftBuilder.tsx` (Lines 128-133)
```typescript
{ title: "Manual Export", value: "manual-export" }
{ title: "Connected Blog", value: "dc-marketing-blog" }  // ❌ HARDCODED
```

#### C. `components/ai-blogger/AIBloggerPostStatusControls.tsx` (11+ occurrences)
```typescript
const publishesToDCBlog = nextStatus === "Published" && targetType === "dc-marketing-blog"
```

**Lines affected:** 90, 95, 105, 118, 144, 213, 217, 259, 269, 354, 358, 368, 372

**Impact:**
- ❌ UI only recognizes two hardcoded targets
- ❌ Can't add new publishing targets
- ❌ DC-specific validation logic
- ❌ Not generic for other users

---

### 3. 🔴 SEO AUDIT MESSAGES - DC-SPECIFIC COPY (`lib/ai-blogger-seo-audit.ts`)

**Line 396:**
```typescript
"Tighten the topic around a real DC offer, audience pain point, and CTA path before approval."
```

**Line 400:**
```typescript
"Retarget the keyword, angle, or title so this post does not compete with an existing DC article."
```

**Line 756:**
```typescript
"Checks whether the draft is likely to compete with an existing DC article..."
```

**Line 828:**
```typescript
"resolve keyword cannibalization with similar DC posts"
```

**Impact:**
- ❌ Users see "DC" in their feedback (confusing for non-DC clients)
- ❌ Brand messaging is hardcoded
- ❌ Not about their company

---

### 4. 🔴 CONTENT TYPE HARDCODING (`lib/actions/ai-blogger.ts`)

**Lines 702, 917-921:** Hardcoded content types:
```typescript
"evergreen-guide" | "trend-reaction" | "comparison" | "how-to" | "service-explainer" | "service-authority"
```

**Problem:**
- ❌ Only 6 content types available
- ❌ Not customizable per industry/user
- ❌ Service-focused (good for agencies, bad for SaaS/e-commerce)

**Example (Line 809-810):**
```typescript
if (normalizedHref.startsWith("/services/")) { ... }
```
Assumes `/services/` path exists - hardcoded for service businesses

---

### 5. 🔴 DEFAULT SYSTEM PROMPTS (`lib/ai-blogger-config.ts`)

**Lines 36-61:** 5 hardcoded AI system prompts:
```typescript
"You are AI Blogger topic discovery..."
"You are AI Blogger research analyst..."
"You are AI Blogger SEO strategist..."
"You are AI Blogger lead writer..."
"You are AI Blogger image concept generator..."
```

**Problem:**
- ❌ Generic, not brand-aware
- ❌ Not customizable per company
- ❌ Says "AI Blogger" in prompts (exposes tool name)
- ❌ Can't customize tone for different brands

---

### 6. 🔴 ACCESS CONTROL HARDCODING (`lib/ai-blogger-access.ts`)

**Lines 33, 36, 76:** Hardcoded role/plan validation:
```typescript
const isAdmin = role === "admin"
if (role === "client") { ... }
const isPaidPlan = plan === "pro" || plan === "enterprise"
```

**Problem:**
- ❌ Only recognizes hardcoded roles: admin, client, superadmin
- ❌ Only recognizes hardcoded plans: pro, enterprise
- ❌ Can't add custom roles/plans
- ❌ Tightly coupled to specific business model

---

### 7. 🔴 WEBHOOK CONFIGURATION - AGENCY-SPECIFIC (`lib/ai-blogger-webhook.ts`)

**Lines 3, 9, 75-76, 220-221:** Agency-specific context throughout:
```typescript
function sendWebhookToAgency() { ... }
function buildWebhookPayload() { ... }
// Agency context assumed throughout
```

**Problem:**
- ❌ Webhook logic assumes "agency" model
- ❌ Can't work for SaaS/e-commerce users
- ❌ Publishing flow tied to agency workflow

---

### 8. 🟡 INTERNAL LINK BASE URL (`lib/ai-blogger-internal-link-utils.ts`)

**Line 6:**
```typescript
const DEFAULT_INTERNAL_LINK_BASE_URL = "https://example.com"
```

**Problem:**
- ⚠️  Uses example.com as fallback
- ⚠️  Should be configurable per agency/user

---

### 9. 🟡 USER AGENT STRINGS (Expected, but branded)

**lib/ai-blogger-website-intelligence.ts (Line 44):**
```typescript
"Mozilla/5.0 (compatible; AIBloggerCrawler/1.0; +https://example.com/ai-blogger)"
```

**lib/ai-blogger-serp-analysis.ts (Line 62):**
```typescript
"Mozilla/5.0 (compatible; AIBloggerSerpBot/1.0; +https://example.com/ai-blogger)"
```

**lib/ai-blogger-grounded-research.ts (Line 32):**
```typescript
"Mozilla/5.0 (compatible; AIBloggerResearchBot/1.0; +https://example.com/ai-blogger)"
```

**Status:** ⚠️  Expected for bots, but exposes tool name

---

### 10. 🟡 EXTERNAL API ENDPOINTS (Expected hardcoding)

These are standard APIs and NOT company-specific, but just documenting:

**lib/actions/ai-blogger.ts:**
- Line 597-598: Google OAuth endpoints (✅ Standard)
- Line 3315: Google Search Console (✅ Standard)
- Line 3497, 3536: Google Generative AI (✅ Standard)
- Line 4370: PageSpeed Insights (✅ Standard)
- Line 3854+: JSON-LD schema contexts (✅ Standard - `https://schema.org`)

**lib/ai-blogger-serp-analysis.ts (Line 630):**
- SerpAPI endpoint (✅ Standard API)

**lib/ai-blogger-trends.ts (Line 124):**
- SerpAPI endpoint (✅ Standard API)

**Status:** ✅ These are fine - standard public APIs

---

### 11. 🟡 ROLE-BASED ROUTING (`lib/ai-blogger-dashboard.ts`)

**Lines 17-21:** Hardcoded role routing:
```typescript
if (currentUser.role === "superadmin") redirect("/super-admin");
if (currentUser.role === "client") redirect("/client/...");
```

**Status:** ⚠️  Hardcoded roles - same issue as #6

---

## SUMMARY TABLE

| # | File | Issue | Severity | Type |
|---|------|-------|----------|------|
| 1 | `lib/ai-blogger-internal-links.ts` | DC hardcoded links + domain | 🔴 CRITICAL | Internal Links |
| 2a | `lib/ai-blogger-presentation.ts` | Target type labels | 🔴 CRITICAL | Publishing |
| 2b | `AIBloggerDraftBuilder.tsx` | UI target options | 🔴 CRITICAL | Publishing |
| 2c | `AIBloggerPostStatusControls.tsx` | Publishing logic | 🔴 CRITICAL | Publishing |
| 3 | `lib/ai-blogger-seo-audit.ts` | "DC" in messages | 🔴 CRITICAL | Copy |
| 4 | `lib/actions/ai-blogger.ts` | Content types + paths | 🔴 CRITICAL | Config |
| 5 | `lib/ai-blogger-config.ts` | System prompts | 🔴 CRITICAL | AI Config |
| 6 | `lib/ai-blogger-access.ts` | Roles/plans | 🔴 CRITICAL | Access Control |
| 7 | `lib/ai-blogger-webhook.ts` | Agency-specific | 🔴 CRITICAL | Publishing |
| 8 | `lib/ai-blogger-internal-link-utils.ts` | Base URL | 🟡 MEDIUM | Config |
| 9 | Bot user agents | Tool name exposed | 🟡 MEDIUM | Minor |
| 10 | External APIs | ✅ Standard APIs | ✅ OK | N/A |
| 11 | Dashboard routing | Hardcoded roles | 🟡 MEDIUM | Routing |

---

## IMPACT ASSESSMENT

### For Non-DC Users:
- ❌ No internal link suggestions (hardcoded to DC only)
- ❌ Publishing targets don't match their workflow
- ❌ SEO messages reference "DC" company
- ❌ Content types don't fit their industry
- ❌ Can't customize system prompts for their brand
- ❌ Access control doesn't support their roles/plans
- ❌ Webhook assumes agency model only

### Current State:
🔴 **AI Blogger is ONLY suitable for Digital Corvids**
🔴 **NOT production-ready for general use**
🔴 **Not truly multi-tenant**

---

## REQUIRED FIXES (Priority Order)

### PRIORITY 1️⃣ (BLOCKING - Must fix for multi-tenant):

1. **Internal Links** - Make configurable per agency
   - Files: `lib/ai-blogger-internal-links.ts`
   - Remove: `DC_STATIC_LINK_CANDIDATES`
   - Add: Database-driven link management

2. **Publishing Targets** - Remove hardcoded `dc-marketing-blog`
   - Files: `lib/ai-blogger-presentation.ts`, `AIBloggerDraftBuilder.tsx`, `AIBloggerPostStatusControls.tsx`
   - Replace: Dynamic target configuration

3. **SEO Messages** - Remove company brand references
   - File: `lib/ai-blogger-seo-audit.ts`
   - Replace: Generic, company-agnostic messages

4. **Content Types** - Make configurable
   - File: `lib/actions/ai-blogger.ts`
   - Add: Industry-specific content type templates

5. **System Prompts** - Make customizable per brand
   - File: `lib/ai-blogger-config.ts`
   - Add: Database storage for custom prompts per agency

### PRIORITY 2️⃣ (IMPORTANT):

6. **Access Control** - Support dynamic roles/plans
   - File: `lib/ai-blogger-access.ts`
   - Refactor: Dynamic role/plan checking

7. **Webhook Configuration** - Support multiple target models
   - File: `lib/ai-blogger-webhook.ts`
   - Refactor: Generic publishing flow

8. **Base URLs** - Make configurable
   - File: `lib/ai-blogger-internal-link-utils.ts`

### PRIORITY 3️⃣ (NICE TO HAVE):

9. **User Agent Strings** - Consider branding strategy
10. **Dashboard Routing** - Support dynamic roles

---

## NEXT STEPS

This system needs **significant refactoring** to be truly generic:

✅ Already fixed:
- `sanitizeTarget()` function (line 1952)
- Removed hardcoded blog types from validations

❌ Still needs fixing:
- Internal links system (complete redesign)
- Publishing target configuration UI
- SEO copy/messages (brand-agnostic)
- Content types (configurable template)
- System prompts (customizable)
- Access control (flexible roles/plans)
- Publishing workflows (configurable)

---

## VERIFICATION

To verify completeness of remaining issues, search for:
- `dc-marketing-blog` (DC-specific)
- `agency-blog` (generic but coupled)
- `digitalcordvids` (company name)
- `DC_` (DC-specific constants)
- `/services/` (hardcoded path assumption)
- `content-type` (hardcoded types)
- `"admin"` (hardcoded roles)
- `"pro" || "enterprise"` (hardcoded plans)

---

## CONCLUSION

**Current AI Blogger Status:** ❌ Company-specific system, not generic
**Production Readiness:** ❌ Not ready for all users
**Multi-tenant Suitability:** ❌ Requires significant refactoring

This is a **substantial undertaking** but critical for making AI Blogger truly usable by any company/website.
