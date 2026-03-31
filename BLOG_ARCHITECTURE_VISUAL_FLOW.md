# AI BLOGGER → DC WEBSITE: Visual Architecture

## COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI BLOGGER GENERATION & PUBLISHING                       │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: GENERATION (AI Creates Blog)
┌──────────────────────────────────────────────────────────────────────────────┐
│                          AI BLOGGER ENGINE                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ INPUT:                                                                 │  │
│  │  • Topic: "AI Blogger Explained"                                       │  │
│  │  • Target audience: "Agency owners"                                    │  │
│  │  • Tone: "Professional but conversational"                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                            │
│                                  ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ AI PROCESSES:                                                          │  │
│  │  1 Research (SERP analysis, trends, competitor posts)                  │  │
│  │  2 Internal link suggestions (cluster-aware)                           │  │
│  │  3 Generate outline (H2/H3 structure)                                  │  │
│  │  4 Write content (AI-generated, citations included)                    │  │
│  │  5 Generate FAQ items                                                  │  │
│  │  6 Create featured image (AI-generated)                                │  │
│  │  7 Generate meta tags (title, description, keywords)                   │  │
│  │  8 Build schema markup (JSON-LD)                                       │  │
│  │  9 SEO validation (26+ checks)                                         │  │
│  │  10 Assign to cluster (contentClusterId, parentTopicSlug)             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                            │
│                                  ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ OUTPUT: BlogStudioPost (in AI Blogger Database)                        │  │
│  │ ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │ │ {                                                                │   │  │
│  │ │   id: "post-123",                                              │   │  │
│  │ │   slug: "ai-blogger-explained",                                │   │  │
│  │ │   title: "AI Blogger Explained: Complete Guide...",           │   │  │
│  │ │   content: "<h2>Introduction</h2>...",                         │   │  │
│  │ │   metaTitle: "AI Blogger: Generate Blogs Instantly | DC",     │   │  │
│  │ │   metaDescription: "Learn how AI Bloggers create SEO-opt...", │   │  │
│  │ │   metaKeywords: "AI, blogging, content generation",           │   │  │
│  │ │   canonicalUrl: "https://digitalcorvids.com/blog/ai-blogger", │   │  │
│  │ │   featuredImageUrl: "https://cdn.../hero.jpg",               │   │  │
│  │ │   featuredImageAlt: "AI Blogger dashboard overview",          │   │  │
│  │ │   excerpt: "Discover how AI Bloggers can...",                 │   │  │
│  │ │   faqItems: [ { q: "...", a: "..." }, ... ],                 │   │  │
│  │ │   internalLinks: [                          ← NEW! (Gap #1)   │   │  │
│  │ │     {                                                          │   │  │
│  │ │       href: "/blog/seo-guide",                                │   │  │
│  │ │       title: "Complete SEO Guide",                            │   │  │
│  │ │       anchorText: "SEO best practices",                       │   │  │
│  │ │       relationType: "cluster-supporting",                     │   │  │
│  │ │       score: 92,                                              │   │  │
│  │ │       clusterAligned: true                                    │   │  │
│  │ │     }                                                          │   │  │
│  │ │   ],                                                           │   │  │
│  │ │   contentClusterId: "cluster-seo-101",      ← Cluster info    │   │  │
│  │ │   parentTopicSlug: "seo-fundamentals",       ← Pillar post    │   │  │
│  │ │   status: "Draft"                                             │   │  │
│  │ │ }                                                              │   │  │
│  │ └──────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

STEP 2: REVIEW (User Reviews & Edits in AI Blogger)
┌──────────────────────────────────────────────────────────────────────────────┐
│ User can edit:                                                               │
│  • Title (refine clarity)                                                    │
│  • Content (add/remove sections)                                             │
│  • Meta tags (customize SEO)                                                 │
│  • Internal links (add/remove/reorder)                                       │
│  • FAQ items (modify questions/answers)                                      │
│  • Featured image (replace or regenerate)                                    │
│  • Category & tags                                                            │
│                                                                               │
│ Validation runs: ✅ Metadata validation (7 checks from Gap #4)               │
└──────────────────────────────────────────────────────────────────────────────┘

STEP 3: PUBLISHING (Click "Publish" Button)
┌──────────────────────────────────────────────────────────────────────────────┐
│ publishBlogStudioPostImpl() executes:                                         │
│                                                                               │
│  1. Validate: SEO audit, cannibalization, metadata                          │
│                                                                               │
│  2. Create MARKETING BLOG Entry:                                             │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Blog.create({                                                      │   │
│     │   title: post.title,                                               │   │
│     │   slug: post.slug,  // auto-unique                                │   │
│     │   content: post.content,  // HTML with embedded links             │   │
│     │   metaTitle: post.metaTitle,                                      │   │
│     │   metaDescription: post.metaDescription,                          │   │
│     │   metaKeywords: post.brief.keywords,                              │   │
│     │   canonicalUrl: post.canonicalUrl,                                │   │
│     │   shortDescription: post.excerpt,                                 │   │
│     │   image: post.featuredImageUrl,                                   │   │
│     │   imageAlt: post.featuredImageAlt,                                │   │
│     │   internalLinks: post.internalLinks,       ← NEW!                │   │
│     │   contentClusterId: post.contentClusterId, ← NEW!                │   │
│     │   parentTopicSlug: post.parentTopicSlug,   ← NEW!                │   │
│     │   faqItems: post.faqItems,                                        │   │
│     │   schemaMarkup: buildSchemaMarkup(...),                           │   │
│     │   status: "published",                                            │   │
│     │   publishedAt: now                                                │   │
│     │ })                                                                 │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  3. Build & save Schema Markup (JSON-LD):                                    │
│     {                                                                         │
│       "@context": "https://schema.org",                                      │
│       "@type": "BlogPosting",                                                │
│       "headline": "AI Blogger Explained",                                    │
│       "datePublished": "2024-03-30T00:00:00Z",                              │
│       "author": { "@type": "Person", "name": "Digital Corvids" },           │
│       "faqPage": { "mainEntity": [ ... ] },  ← FAQ schema                  │
│       "articleBody": "..."                                                   │
│     }                                                                         │
│                                                                               │
│  4. Run Metadata Validation (from Gap #4):                                   │
│     ✅ Meta title length (30-60 chars)                                       │
│     ✅ Meta description length (120-160 chars)                               │
│     ✅ Schema markup valid JSON-LD                                           │
│     ✅ Canonical URL format valid                                            │
│     ✅ Featured image URL valid + alt text present                           │
│     ✅ Content 300+ words                                                    │
│     ✅ Excerpt present                                                       │
│     Save: publishedMetadataValidatedAt = now                                 │
│                                                                               │
│  5. Update AI Blogger Post:                                                  │
│     BlogStudioPost.update({                                                  │
│       status: "Published",                                                   │
│       publishedAt: now,                                                      │
│       publishedEntryId: marketingPost._id,     // Reference to Blog         │
│       publishedEntrySlug: marketingPost.slug,   // Reference to Blog         │
│       publishedMetadataValidatedAt: now         // Gap #4 validation         │
│     })                                                                        │
│                                                                               │
│  6. Revalidate Next.js paths:                                                │
│     • /blog/[slug]                                                           │
│     • /blog (index page)                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

DATA SAVED IN MARKETING BLOG COLLECTION:
┌──────────────────────────────────────────────────────────────────────────────┐
│ MongoDB Collection: "blogs"                                                   │
│                                                                               │
│ Document Structure:                                                           │
│ {                                                                             │
│   _id: MongoDB ObjectId,                                                     │
│   title: "AI Blogger Explained: Complete Guide...",                          │
│   slug: "ai-blogger-explained",          ← Unique key!                      │
│   content: "<h2>Introduction</h2><p>AI Bloggers...<a href='...'>SEO...</a>", │
│   metaTitle: "AI Blogger: Generate Blogs Instantly | DC",                    │
│   metaDescription: "Learn how AI Bloggers create SEO-optimized blogs...",    │
│   metaKeywords: "AI, blogging, content generation, automation",              │
│   canonicalUrl: "https://digitalcorvids.com/blog/ai-blogger-explained",     │
│   shortDescription: "Discover how AI Bloggers can save your team...",        │
│   category: "AI & Technology",                                               │
│   image: "https://cdn.../hero.jpg",                                          │
│   imageAlt: "AI Blogger dashboard overview",                                 │
│   internalLinks: [                       ← NEW from Gap #1!                  │
│     {href, title, anchorText, relationType, score, clusterAligned}          │
│   ],                                                                          │
│   contentClusterId: "cluster-seo-101",   ← NEW from Gap #1!                 │
│   parentTopicSlug: "seo-fundamentals",   ← NEW from Gap #1!                 │
│   faqItems: [{ question, answer }, ...],                                     │
│   schemaMarkup: "{...JSON-LD...}",                                           │
│   status: "published",                                                       │
│   publishedAt: "2024-03-30T10:00:00Z",                                       │
│   createdAt: "2024-03-30T10:00:00Z",                                         │
│   updatedAt: "2024-03-30T10:05:00Z"                                          │
│ }                                                                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                  DC WEBSITE: SERVING THE PUBLISHED BLOG                       │
└──────────────────────────────────────────────────────────────────────────────┘

USER VISITS: https://digitalcorvids.com/blog/ai-blogger-explained
                                      │
                                      ▼
Next.js Routing catches /blog/[slug] request
                                      │
                                      ▼
Executes: app/(marketing)/blog/[slug]/page.jsx
                                      │
                                      ▼
getBlog(slug) function:
  const blog = await Blog.findOne({
    slug: "ai-blogger-explained",
    status: "published"  // Only shows published blogs
  })
                                      │
                                      ▼
generateMetadata() builds <head> tags:
  • <title>{{blog.metaTitle}}</title>
  • <meta name="description" content="{{blog.metaDescription}}">
  • <meta name="keywords" content="{{blog.metaKeywords}}">
  • <meta property="og:image" content="{{blog.image}}">
  • <link rel="canonical" href="{{blog.canonicalUrl}}">
  • <script type="application/ld+json">{{blog.schemaMarkup}}</script>
                                      │
                                      ▼
Renders Beautiful Page:
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │         [FULL-WIDTH HERO IMAGE WITH GRADIENT OVERLAY]             │   │
│  │                                                                      │   │
│  │         ← Back to Insights | Home / Blog / Category              │   │
│  │                                                                      │   │
│  │         [AI & TECHNOLOGY BADGE]                                     │   │
│  │                                                                      │   │
│  │         AI BLOGGER EXPLAINED: COMPLETE GUIDE                       │   │
│  │                                                                      │   │
│  │         Discover how AI Bloggers can save your team...            │   │
│  │                                                                      │   │
│  │         👤 Digital Corvids  |  📅 Mar 30, 2024  |  ⏱️ 12 MIN     │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ARTICLE CONTENT (styled prose):                                      │   │
│  │                                                                      │   │
│  │ ## Introduction                                                     │   │
│  │ AI Bloggers are AI-powered systems that generate articles...        │   │
│  │ [SEE: Complete SEO Guide] ← Embedded internal link                 │   │
│  │                                                                      │   │
│  │ ## How AI Bloggers Work                                             │   │
│  │ The process involves 5 key steps...                                │   │
│  │                                                                      │   │
│  │ ### Step 1: Research                                                │   │
│  │ ...                                                                  │   │
│  │                                                                      │   │
│  │ ## FAQ                                                               │   │
│  │ Q: What is an AI Blogger?                                           │   │
│  │ A: An AI Blogger is a system that automatically generates...        │   │
│  │                                                                      │   │
│  │ ## Share This Article                                               │   │
│  │ [TWITTER] [LINKEDIN] [FACEBOOK]                                    │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘


WHAT'S IN THE PAGE HTML:
┌──────────────────────────────────────────────────────────────────────────────┐
│ <head>                                                                        │
│   <title>AI Blogger: Generate Blogs Instantly | DC</title>                  │
│   <meta name="description" content="Learn how AI Bloggers create...">       │
│   <meta name="keywords" content="AI, blogging, content generation">         │
│   <meta property="og:title" content="AI Blogger: Generate Blogs...">        │
│   <meta property="og:description" content="Learn how AI Bloggers...">       │
│   <meta property="og:image" content="https://cdn.../hero.jpg">              │
│   <link rel="canonical" href="https://dc.../blog/ai-blogger-explained">   │
│   <script type="application/ld+json">                                       │
│   {                                                                           │
│     "@context": "https://schema.org",                                        │
│     "@type": "BlogPosting",                                                  │
│     "headline": "AI Blogger Explained: Complete Guide",                      │
│     "description": "Learn how AI Bloggers create SEO-optimized blogs",       │
│     "image": "https://cdn.../hero.jpg",                                     │
│     "datePublished": "2024-03-30T00:00:00Z",                                │
│     "author": { "@type": "Person", "name": "Digital Corvids" },             │
│     "faqPage": {                                                             │
│       "mainEntity": [                                                       │
│         {                                                                    │
│           "@type": "Question",                                              │
│           "name": "What is an AI Blogger?",                                 │
│           "acceptedAnswer": {                                               │
│             "@type": "Answer",                                              │
│             "text": "An AI Blogger is a system that..."                     │
│           }                                                                  │
│         }                                                                    │
│       ]                                                                      │
│     }                                                                         │
│   }                                                                           │
│   </script>                                                                  │
│ </head>                                                                      │
│ <body>                                                                       │
│   <!-- Everything rendered from blog document -->                            │
│ </body>                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘

GOOGLE SEES:
┌──────────────────────────────────────────────────────────────────────────────┐
│ Title: AI Blogger: Generate Blogs Instantly | DC                             │
│ Description: Learn how AI Bloggers create SEO-optimized blogs automatically  │
│ Keywords: ai, blogging, content generation, automation                       │
│ Schema: ArticleSchema + FAQSchema for rich snippets                          │
│ Canonical: https://digitalcorvids.com/blog/ai-blogger-explained              │
│ Internal Links: 5 links to /blog/seo-guide, /blog/content-strategy, etc     │
│ Image: og:image + schema image tags                                          │
│                                                                               │
│ Result: Rich snippet in search results with FAQ preview!                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE: Data Journey

```
BlogStudioPost (AI Blogger)
    ↓ (hits Publish)
    ↓ (copies data)
Blog (Marketing Collection)  ← DC Website reads from here
    ↓ (at /blog/[slug])
    ↓
User sees beautiful blog on DC website
    ↓
Google indexes with schema markup
    ↓
Shows in search results with rich snippets
```

---

## ANSWER TO YOUR QUESTIONS NOW:

### **Q1: How do headers, tags, backlinks work?**
- **Headers**: From `title` + content `<h2>, <h3>` formatting
- **Tags**: `metaKeywords`, `category`, `faqItems`
- **Backlinks**: `internalLinks[]` array embedded in `content` HTML

### **Q2: Can we post directly to DC website?**
- **YES!** It's a direct write to Marketing Blog collection
- No export, no download, no intermediate API calls
- DC website auto-reads from same database
- Published instantly live
- Google indexes immediately with schema markup
