# DC Blog Integration Analysis
**Last Updated: 2026-04-01**

## What AI Blogger Sends (15 Steps Output)
The AI Blogger sends a complete SEO-optimized blog via webhook with:

```
IncomingWebhookPayload {
  event: "blog.published"
  blog: {
    id: string (AI Blogger post ID)
    title: string
    slug: string
    content: string (full HTML)
    excerpt: string
    metaKeywords?: string
    metaTitle: string
    metaDescription: string
    canonicalUrl: string
    image: string
    imageAlt: string
    schemaMarkup?: string (JSON-LD markup)
    category?: string
    faqItems?: [{ question, answer }]
    peopleAlsoAsk?: string[]
    internalLinks?: [{
      href, title, anchorText, source,
      relationType, score, matchReason,
      clusterAligned, suggestedSectionHeading,
      targetPostSlug, targetClusterId, targetParentTopicSlug,
      placement
    }]
    contentClusterId?: string
    parentTopicSlug?: string
    publishedAt: string
  }
  source: {
    agencyId: string
    agencyName: string
    publishedAt: string
  }
}
```

---

## What DC Stores in Blog Model
✅ = Stored | ❌ = Lost | 📋 = Audit Table (NEW)

| Field | Stored? | Where | Notes |
|-------|---------|-------|-------|
| title | ✅ | Blog.title | |
| slug | ✅ | Blog.slug | Unique index |
| content | ✅ | Blog.content | Full HTML |
| excerpt | ✅ | Blog.shortDescription | Mapped from excerpt |
| metaKeywords | ✅ | Blog.metaKeywords | Comma-separated |
| metaTitle | ✅ | Blog.metaTitle | SEO title |
| metaDescription | ✅ | Blog.metaDescription | SEO description |
| canonicalUrl | ✅ | Blog.canonicalUrl | Normalized |
| image | ✅ | Blog.image | Normalized URL |
| imageAlt | ✅ | Blog.imageAlt | Image alt text |
| schemaMarkup | ✅ | Blog.schemaMarkup | JSON-LD string |
| category | ✅ | Blog.category | Default: "AI Blogger" |
| faqItems | ✅ | Blog.faqItems | Array of Q&A |
| peopleAlsoAsk | ✅ | Blog.peopleAlsoAsk | Array of questions |
| internalLinks | ✅ | Blog.internalLinks | Full structure |
| contentClusterId | ✅ | Blog.contentClusterId | Indexed |
| parentTopicSlug | ✅ | Blog.parentTopicSlug | Indexed |
| publishedAt | ✅ | Blog.publishedAt | Date |
| **id (AI Blogger)** | 📋 | BlogPublishingAudit.sourcePostId | **Source post ID** |
| **agencyId** | 📋 | BlogPublishingAudit.agencyId | **Audit trail** |
| **agencyName** | 📋 | BlogPublishingAudit.agencyName | **Audit trail** |
| **event type** | 📋 | BlogPublishingAudit.publishingEvent | **How it was published** |
| **source publishedAt** | 📋 | BlogPublishingAudit.publishedByAIBlogger | **True publish time** |

---

## What DC Website DISPLAYS
### On Published Blog Page (`/blog/[slug]`)
**Visible to Users:**
- ✅ Title (large headline)
- ✅ Category (badge)
- ✅ Featured image (hero)
- ✅ Author (hardcoded as "Digital Corvids")
- ✅ Published date
- ✅ Read time (calculated)
- ✅ Content (full HTML rendered)
- ✅ Meta tags (SEO)
- ✅ Schema markup (search engines)
- ✅ "People Also Ask" section
- ✅ FAQ accordion section
- ✅ Share buttons

**NOT Displayed:**
- ❌ Internal links (stored but not visualized)
- ❌ Content cluster info (backend only)
- ❌ Parent topic (backend only)
- ❌ AI Blogger source ID (backend only)
- ❌ Agency info (now in audit only)

### On Blog Card (`/blog` listing)
- ✅ Title
- ✅ Category
- ✅ Excerpt (shortDescription)
- ✅ Featured image
- ✅ Published date

---

## Data Flow Summary
```
AI Blogger (15 steps)
    ↓
Webhook Payload (21 fields)
    ↓
DC Webhook Receiver (route.ts)
    ├─→ Blog Collection (17 fields stored)
    └─→ BlogPublishingAudit Collection (NEW - 8 audit fields)
          ├─ sourcePostId
          ├─ agencyId, agencyName
          ├─ publishingEvent
          ├─ publishedByAIBlogger
          └─ contentSnapshot (metadata)
    ↓
Published on: /blog/[slug]
    (Displays: title, content, metadata, FAQs, people-also-ask)
```

---

## What's Now Captured (NEW)
With the new **BlogPublishingAudit** model:

```javascript
{
  blogSlug,              // Links to Blog doc
  blogId,                // MongoDB reference
  sourcePostId,          // AI Blogger's original ID ← NEW
  agencyId,              // Which agency published ← NEW
  agencyName,            // Agency display name ← NEW
  publishingEvent,       // "blog.published", "blog.updated", etc ← NEW
  publishedByAIBlogger,  // True publication time ← NEW
  receivedByDC,          // When webhook arrived
  webhookStatus,         // success/failed
  contentSnapshot,       // Metadata snapshot at publish time
  status,                // received/stored/published
  createdAt,             // Audit creation time
}
```

---

## Use Cases Now Enabled
1. **Traceability**: Find which agency published which blog
2. **Source Linking**: Map back to AI Blogger source post
3. **Event Audit**: Know if blog was published, updated, or deleted
4. **Timing**: Accurate AI Blogger publication time vs DC receipt
5. **Reporting**: Generate publishing reports per agency
6. **Content Snapshots**: Track metadata changes over time

---

## Queries You Can Now Run

```javascript
// Find all blogs from specific agency
BlogPublishingAudit.find({ agencyId: "agency-123" })

// Find which DC blog came from AI Blogger post
BlogPublishingAudit.findOne({ sourcePostId: "ai-post-456" })

// Track publishing timeline
BlogPublishingAudit.find({
  agencyId: "agency-123",
  createdAt: { $gte: startDate, $lte: endDate }
}).sort({ createdAt: -1 })

// Find deleted blogs
BlogPublishingAudit.find({ publishingEvent: "blog.deleted" })

// Check internal link quality per agency
BlogPublishingAudit.find({
  agencyId: "agency-123"
}).select({ "contentSnapshot.internalLinkCount": 1 })
```
