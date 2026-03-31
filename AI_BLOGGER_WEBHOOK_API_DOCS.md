# AI Blogger Documentation
**Version**: 1.0
**Last Updated**: 2026-03-30

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Webhook System](#webhook-system)
4. [API Reference](#api-reference)
5. [Setup Guide](#setup-guide)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

AI Blogger is a complete content generation and publishing system that:

- **Generates** SEO-optimized blog posts using AI
- **Validates** content against 26+ quality rules
- **Publishes** directly to your website via webhooks
- **Tracks** performance and suggests refreshes
- **Clusters** related content for internal linking

### Key Features

✅ Automatic blog generation with research
✅ SEO validation before publishing
✅ Schedule-based automation
✅ Multi-agency support via webhooks
✅ Real-time performance tracking
✅ Internal link optimization
✅ Content clustering & visualization

---

## How It Works

### The Complete Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CREATES BLOG BRIEF                                   │
│    - Keyword, tone, audience, etc.                           │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AI BLOGGER GENERATES DRAFT                                │
│    - Research (SERP, trends, website crawl)                 │
│    - Write content                                           │
│    - Generate metadata & schema markup                       │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATION GATES                                          │
│    - 26+ SEO rules checked                                   │
│    - Metadata validation                                     │
│    - Internal link requirements                              │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EDITORIAL REVIEW                                          │
│    - User approves or requests changes                       │
│    - AI refines based on feedback                            │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PUBLISH TO YOUR SITE                                      │
│    - Send via webhook to your endpoint                       │
│    - OR schedule for later                                   │
│    - Save metadata, schema, internal links                   │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. MONITOR & OPTIMIZE                                        │
│    - Track Search Console performance                        │
│    - Detect underperforming posts                            │
│    - Suggest refresh opportunities                           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
AI Blogger Database
├── BlogStudioPost (draft/approved)
│   ├── title, content, metadata
│   ├── internalLinks[] (scored)
│   ├── contentClusterId (pillar/supporting)
│   └── seoScore, status
│
└── Published Post (via Webhook)
    ├── Your Site Database
    │   ├── title, content, metadata
    │   ├── internalLinks[] (preserved)
    │   ├── contentClusterId (for clustering)
    │   └── publishedAt, schema markup
    │
    └── Your Website
        └── Rendered blog post with:
            - SEO metadata in <head>
            - Schema markup (JSON-LD)
            - Internal links
            - Featured image
            - FAQ section
```

---

## Webhook System

### What is a Webhook?

A webhook is an HTTP POST request that AI Blogger sends to your website when a blog is published. Your website receives the blog data and saves it to your database.

### How Webhooks Work

```
AI Blogger             Your Website
    │                      │
    ├─ Blog Published ──────→ Webhook URL
    │                      │
    │                      ├─ Receive POST
    │                      │
    │                      ├─ Save to Database
    │                      │
    └──────────────────────← HTTP 200 OK
```

### Webhook Payload

When a blog is published, AI Blogger sends a POST request with this data:

```json
{
  "event": "blog.published",
  "timestamp": "2026-03-30T14:23:45Z",
  "agencyId": "agency-123",
  "blog": {
    "_id": "blog-567",
    "title": "Complete Guide to SEO in 2026",
    "slug": "complete-guide-seo-2026",
    "content": "<h1>Complete Guide...</h1><p>Content here...</p>",
    "excerpt": "Learn the best SEO practices...",
    "metaTitle": "Complete Guide to SEO 2026 | Expert Tips",
    "metaDescription": "Master modern SEO with our comprehensive guide covering on-page, technical, and link-building strategies.",
    "canonicalUrl": "https://yoursite.com/blog/complete-guide-seo-2026",
    "metaKeywords": "SEO, search engine optimization, rankings",
    "category": "SEO",
    "image": "https://cdn.example.com/images/seo-guide.jpg",
    "imageAlt": "SEO optimization checklist",
    "schemaMarkup": "{\"@context\": \"https://schema.org\", \"@type\": \"BlogPosting\", ...}",
    "faqItems": [
      {
        "question": "What is SEO?",
        "answer": "SEO stands for search engine optimization..."
      }
    ],
    "internalLinks": [
      {
        "href": "/blog/keyword-research-guide",
        "title": "Keyword Research Guide",
        "anchorText": "keyword research",
        "source": "blog",
        "relationType": "cluster-supporting",
        "score": 85,
        "matchReason": "Related SEO topic",
        "clusterAligned": true,
        "targetPostSlug": "keyword-research-guide",
        "targetClusterId": "cluster-seo",
        "targetParentTopicSlug": "seo-pillar"
      }
    ],
    "contentClusterId": "cluster-seo",
    "parentTopicSlug": "seo-pillar",
    "publishedAt": "2026-03-30T14:23:45Z",
    "createdAt": "2026-03-29T10:00:00Z",
    "updatedAt": "2026-03-30T14:23:45Z"
  }
}
```

### Setting Up Your Webhook Endpoint

#### 1. Go to AI Blogger Settings

Navigate to: **Dashboard > AI Blogger > Settings > Publishing Tab**

#### 2. Configure Webhook

```
Target Type: "webhook" (dropdown)
Webhook URL: https://your-site.com/api/webhooks/blog-published
Active: Toggle ON
Retry Attempts: 3
Timeout (seconds): 30
```

#### 3. Test Connection

Click **"Test Webhook"** button to verify your endpoint is reachable.

---

## API Reference

### Webhook Endpoint

**Endpoint**: Your configured webhook URL
**Method**: `POST`
**Content-Type**: `application/json`
**Authentication**: None (by default - can add API key in URL params)

### Request Headers

```
POST /api/webhooks/blog-published HTTP/1.1
Host: your-site.com
Content-Type: application/json
Content-Length: 5432
X-Webhook-Signature: sha256=abc123...
X-Webhook-ID: webhook-id-123
X-Webhook-Timestamp: 2026-03-30T14:23:45Z
```

### Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Blog saved, webhook complete |
| 201 | Created | Blog created and saved |
| 400 | Bad Request | Invalid payload, fix and retry |
| 401 | Unauthorized | Auth failed, check credentials |
| 404 | Not Found | Endpoint doesn't exist |
| 500 | Server Error | Your server error, fix and retry |

### Retry Logic

If your server returns a non-200 status:

1. **Attempt 1**: Immediate retry
2. **Attempt 2**: 5 second delay
3. **Attempt 3**: 10 second delay
4. **Failed**: Logged in AI Blogger settings (manual resend available)

---

## Setup Guide

### For Next.js/Node.js Websites

#### Step 1: Create Webhook Endpoint

Create file: `app/api/webhooks/blog-published/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/Blog"; // Your blog model
import dbConnect from "@/lib/db"; // Your DB connection

export async function POST(request: NextRequest) {
  try {
    // 1. Parse webhook payload
    const payload = await request.json();

    // 2. Validate payload
    if (!payload.blog || !payload.blog.slug) {
      return NextResponse.json(
        { error: "Invalid blog data" },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Save blog to database
    const blog = await Blog.findOneAndUpdate(
      { slug: payload.blog.slug },
      {
        title: payload.blog.title,
        content: payload.blog.content,
        metaTitle: payload.blog.metaTitle,
        metaDescription: payload.blog.metaDescription,
        canonicalUrl: payload.blog.canonicalUrl,
        category: payload.blog.category,
        image: payload.blog.image,
        imageAlt: payload.blog.imageAlt,
        schemaMarkup: payload.blog.schemaMarkup,
        faqItems: payload.blog.faqItems,
        internalLinks: payload.blog.internalLinks,
        contentClusterId: payload.blog.contentClusterId,
        parentTopicSlug: payload.blog.parentTopicSlug,
        publishedAt: new Date(payload.blog.publishedAt),
        status: "published",
      },
      { upsert: true, new: true }
    );

    // 5. Optional: Trigger ISR revalidation
    await fetch(`http://localhost:3000/api/revalidate?secret=YOUR_SECRET&slug=${payload.blog.slug}`);

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        blogId: blog._id,
        message: "Blog saved successfully"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[Webhook Error]", error);

    return NextResponse.json(
      { error: "Failed to save blog" },
      { status: 500 }
    );
  }
}
```

#### Step 2: Set Webhook URL

In AI Blogger Settings:
```
Webhook URL: https://your-site.com/api/webhooks/blog-published
```

#### Step 3: Test

Click "Test Webhook" in settings to verify connection.

---

### For Other Frameworks

#### Express.js

```javascript
app.post("/api/webhooks/blog-published", async (req, res) => {
  const { blog } = req.body;

  // Save blog to database
  const savedBlog = await Blog.create({
    title: blog.title,
    slug: blog.slug,
    content: blog.content,
    // ... other fields
  });

  res.json({ success: true, blogId: savedBlog.id });
});
```

#### Django

```python
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

@require_http_methods(["POST"])
def blog_webhook(request):
    try:
        payload = json.loads(request.body)
        blog = payload.get("blog")

        # Save to database
        Blog.objects.create(
            title=blog["title"],
            slug=blog["slug"],
            content=blog["content"],
            # ... other fields
        )

        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
```

#### Laravel

```php
Route::post('/api/webhooks/blog-published', function (Request $request) {
    $payload = $request->json();
    $blog = $payload['blog'];

    Blog::create([
        'title' => $blog['title'],
        'slug' => $blog['slug'],
        'content' => $blog['content'],
        // ... other fields
    ]);

    return response()->json(['success' => true]);
});
```

---

## Examples

### Example 1: Save Blog and Revalidate Cache

```typescript
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { blog } = payload;

  // Save blog
  await Blog.findOneAndUpdate(
    { slug: blog.slug },
    {
      title: blog.title,
      content: blog.content,
      metaTitle: blog.metaTitle,
      status: "published",
    },
    { upsert: true }
  );

  // Revalidate ISR cache
  try {
    await fetch(
      `http://localhost:3000/api/revalidate?secret=${process.env.REVALIDATE_SECRET}&slug=${blog.slug}`,
      { method: "POST" }
    );
  } catch (error) {
    console.log("ISR revalidation queued (async)");
  }

  return NextResponse.json({ success: true });
}
```

### Example 2: Validate Metadata Before Saving

```typescript
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { blog } = payload;

  // Validate metadata
  const errors = [];

  if (!blog.metaTitle || blog.metaTitle.length < 30) {
    errors.push("Meta title too short");
  }

  if (!blog.metaDescription || blog.metaDescription.length < 120) {
    errors.push("Meta description too short");
  }

  if (!blog.schemaMarkup) {
    errors.push("Missing schema markup");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  // Save if valid
  await Blog.create(blog);

  return NextResponse.json({ success: true });
}
```

### Example 3: Process Internal Links

```typescript
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { blog } = payload;

  // Process internal links
  const processedLinks = blog.internalLinks.map(link => ({
    ...link,
    processed: true,
    addedAt: new Date(),
  }));

  // Save with processed links
  await Blog.create({
    ...blog,
    internalLinks: processedLinks,
  });

  return NextResponse.json({ success: true });
}
```

---

## Troubleshooting

### Webhook Not Triggering

**Problem**: Blog publishes but webhook doesn't receive request

**Solutions**:
1. ✅ Check URL is correct: `https://your-site.com/api/webhooks/blog-published`
2. ✅ Verify endpoint is public (no authentication on webhook URL)
3. ✅ Check firewall/security groups allow inbound requests
4. ✅ Enable CORS if calling from different domain
5. ✅ Test with curl: `curl -X POST https://your-site.com/api/webhooks/blog-published -d '{}'`

### 400 Bad Request

**Problem**: Webhook returns 400 error

**Solutions**:
1. ✅ Check payload JSON is valid
2. ✅ Verify all required fields are present
3. ✅ Log request body: `console.log(req.body)`
4. ✅ Validate blog schema matches your database

### Timeout (30 seconds)

**Problem**: Webhook times out

**Solutions**:
1. ✅ Database is slow: Add indexes on `slug`
2. ✅ External API call in webhook: Move to background job
3. ✅ Increase timeout in settings (up to 60 seconds)
4. ✅ Use async operations: `res.send(200)` immediately, process later

### Duplicate Blogs

**Problem**: Same blog saved multiple times

**Solutions**:
1. ✅ Use `findOneAndUpdate` with `upsert: true`
2. ✅ Check slug is unique in database
3. ✅ Verify "unique URL" constraint on slug field
4. ✅ Return 200 immediately (prevent retries)

### Internal Links Not Saving

**Problem**: Blog saved but internalLinks array is empty

**Solutions**:
1. ✅ Check database schema has `internalLinks` field
2. ✅ Verify mongo model accepts array: `internalLinks: [{}]`
3. ✅ Log payload: `console.log(payload.blog.internalLinks)`
4. ✅ Check array is not being truncated

---

## Webhook Status Tracking

In AI Blogger Settings > Automation tab, you can see:

- **Last webhook delivery**: When webhook was last sent
- **Delivery status**: Success, Failed, Pending
- **Retry count**: How many times it retried
- **Error message**: What went wrong (if failed)

If webhook fails and max retries exceeded:
1. Error logged in settings
2. "Manual Resend" button appears
3. Fix your endpoint and click Resend

---

## Security Best Practices

### 1. Verify Webhook Signature (Optional)

```typescript
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("X-Webhook-Signature");
  const body = await request.text();

  // Verify signature
  const expected = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET || "")
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Process webhook...
}
```

### 2. Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

app.post("/api/webhooks/blog-published", limiter, handler);
```

### 3. Input Validation

```typescript
const { body, validationResult } = require("express-validator");

const validateBlog = [
  body("blog.title").isString().trim().isLength({ min: 5 }),
  body("blog.slug").isString().matches(/^[a-z0-9-]+$/),
  body("blog.content").isString().isLength({ min: 100 }),
];

app.post("/api/webhooks/blog-published", validateBlog, handler);
```

---

## FAQ

**Q: Can I use OAuth or API keys for authentication?**
A: Yes, you can add to the URL: `https://your-site.com/api/webhooks/blog-published?apiKey=YOUR_KEY`

**Q: What if my server is offline when webhook triggers?**
A: AI Blogger retries up to 3 times. Manual resend available in settings.

**Q: Can I customize the webhook payload?**
A: Currently No, but contact support for custom field requests.

**Q: Do you log webhook calls?**
A: Yes, all webhook deliveries logged in Settings > Automation tab.

**Q: Can I disable webhooks?**
A: Yes, toggle "Active" off in Publishing settings. Blogs won't be sent.

**Q: What's the webhook latency?**
A: Typically < 2 seconds from publish to webhook delivery.

---

**Need help?** Check the troubleshooting section or contact support.

