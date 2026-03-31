# AI Blogger User Guide
**Version**: 1.0
**Last Updated**: 2026-03-30

---

## Quick Start

### For New Users

1. **Go to Dashboard > AI Blogger**
2. **Click "Generate New Blog"**
3. **Fill in the brief** (keyword, tone, audience)
4. **AI Blogger generates draft** (10-15 minutes)
5. **Review and approve**
6. **Publish** (sends to your website via webhook)

---

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Generating Blogs](#generating-blogs)
3. [Managing Posts](#managing-posts)
4. [Publishing & Scheduling](#publishing--scheduling)
5. [Settings & Configuration](#settings--configuration)
6. [Refresh Queue](#refresh-queue)
7. [Content Clusters](#content-clusters)
8. [Key Metrics](#key-metrics)

---

## Dashboard Overview

### Main Navigation

The AI Blogger dashboard has 6 main sections (visible in top menu):

```
📊 Overview    → Dashboard home with key metrics
✨ Generate    → Create new blog posts
📝 Posts       → Manage all blog drafts
🔄 Refresh     → See posts that need updating
📈 Clusters    → View content relationships
⚙️ Settings    → Configure AI Blogger
```

### Overview Page

The **Overview** page shows:

**Top Section:**
- Welcome message
- Quick action buttons (Generate, Queue, Clusters)

**Metrics Cards (5):**
| Card | Meaning |
|------|---------|
| 📄 Draft Queue | Posts still being written |
| ✨ Ready To Review | Awaiting your approval |
| 📅 Active Schedules | Automation runs |
| ✅ Published Posts | Live on your site |
| 🔄 Refresh Queue | Posts that need updating |

**Workflow Section:**
- Current publishing settings
- Publishing pipeline (6 steps)
- "Best next action" recommendation

**Performance Sync Card:**
- Search Console connection status
- Last sync time
- Snapshot counts

**Refresh Queue Preview:**
- Up to 2 refresh candidates shown
- Shows keywords losing traffic
- Click "View Full Queue" for details

**Recent Drafts:**
- Latest 6 blog drafts
- Status badge (Draft, Review, Approved)
- SEO score progress bar

---

## Generating Blogs

### Step 1: Start Generation

**Path:** AI Blogger > Generate

Click the **"Generate New Blog"** button, or go directly to `/dashboard/ai-blogger/generate`

### Step 2: Fill Blog Brief

**Required Fields:**

1. **Keyword** (Required)
   - Main search term
   - Example: "SEO best practices 2026"
   - Max 100 characters

2. **Blog Title** (Auto-generated)
   - Can edit manually
   - Should include keyword
   - 50-70 characters recommended

3. **Tone** (Dropdown)
   - Professional, Casual, Educational, Sales-focused
   - Inherited from Brand Voice settings
   - Can override per blog

4. **Target Audience** (Dropdown)
   - Beginners, Intermediate, Advanced
   - Affects content depth
   - Inherited from settings

5. **Search Intent** (Optional)
   - Informational: "how to", "what is"
   - Commercial: product reviews
   - Transactional: "buy now"
   - Navigational: brand/site specific

### Step 3: Content Options

**Type of Content:**
- Blog Post (default)
- How-to Guide
- List Article
- Case Study
- Interview

**Content Length:**
- Short (500-1000 words)
- Medium (1000-2000 words)
- Long (2000+ words)
- Extra Long (3000+ words)

### Step 4: Research & Analysis

**AI Blogger automatically:**

1. ✅ **Analyzes Search Results** (Top 10 Google results)
   - Extracts keywords competitors rank for
   - Identifies common topics
   - Notes search intent

2. ✅ **Crawls Your Website** (Up to 4 pages)
   - Finds related content
   - Identifies internal linking opportunities
   - Detects plagiarism risks

3. ✅ **Checks Search Trends** (Google Trends)
   - Validates keyword is trending
   - Finds related search queries
   - Detects seasonal patterns

4. ✅ **Gathers Sources** (Optional)
   - Grounded research from trusted sources
   - Statistics and data points
   - Expert quotes

### Step 5: Review Research

Before writing, AI Blogger shows:
- Found keywords to include
- Related blogs on your site
- Trending variations
- Suggested section structure

Click **"Proceed to Writing"** to continue.

### Step 6: AI Writes Content

AI Blogger generates:
- ✅ Full HTML content
- ✅ Meta title (30-60 chars)
- ✅ Meta description (120-160 chars)
- ✅ Excerpt (100-150 chars)
- ✅ Featured image (found or generated)
- ✅ Internal links (with scores)
- ✅ FAQ section (auto-generated)
- ✅ Schema markup (JSON-LD)

**Duration:** 10-15 minutes

You can **monitor progress** or **close and come back** - draft auto-saves.

### Step 7: SEO Validation

Before you see the draft, AI Blogger checks **26+ validation rules**:

**Hard Blockers (Must fix):**
- ❌ Meta title missing or < 30 chars
- ❌ Meta description missing
- ❌ No internal links
- ❌ Content < 300 words
- ❌ Invalid schema markup

**Warnings (Recommended):**
- ⚠️ Low internal link density
- ⚠️ Missing image alt text
- ⚠️ No FAQ section
- ⚠️ Weak meta title

**Issues** must be resolved before publishing.

### Step 8: Review & Edit

Once generated, you see:

**Post Summary:**
- Title, excerpt, category
- Word count, SEO score
- Status badge

**Content:**
- Full blog HTML
- Can edit in **rich text editor**
- Real-time word count updates

**Meta Section:**
- Meta title
- Meta description
- Canonical URL
- Featured image
- Image alt text

**Advanced Section:**
- Schema markup (JSON-LD)
- Internal links (with scores)
- Content cluster info
- FAQ items

**Side Actions:**
- Save changes
- Preview blog
- Check SEO score
- Move to review

### Step 9: Approval Workflow

**After editing:**

1. **Save as Draft**
   - Saves current state
   - Can edit later
   - Status: "Draft"

2. **Move to Review**
   - Marks for editorial review
   - Status: "SEO Review"
   - Waits for approval

3. **Approve & Schedule**
   - Mark as "Approved"
   - Can publish immediately or schedule
   - Status: "Approved" → "Published"

---

## Managing Posts

### Path: AI Blogger > Posts

View all your blog posts in queue.

### Filters

**By Status:**
- All posts
- Draft (editing)
- Review (awaiting approval)
- Approved (ready)
- Scheduled (queued)
- Published (live)

**By Type:**
- Blog posts
- How-to guides
- Case studies
- List articles

**By Source:**
- AI generated
- Manually created
- Imported

**By Intent:**
- Informational
- Commercial
- Transactional
- Navigational

**By Refresh Reason:**
- Low CTR (< 2%)
- Position decay (dropped rankings)
- Visibility loss
- Stale content (> 6 months)
- No recent sync

### Search

**Find posts by:**
- Keyword/title
- SEO score range
- Word count range
- Date range

### Sorting

**Available sorts:**
- Updated recently
- Created recently
- Highest SEO score
- Highest word count
- Oldest posts
- Most internal links

### Post Card Details

Each post shows:
- 📝 Title
- 🏷️ Status badge (colored)
- 📊 Word count
- ⭐ SEO score (0-100)
- 📅 Last updated
- 🎯 Target type

### Post Actions

**Click post to:**
- ✏️ Edit content
- 👁️ Preview live
- ⚡ Check SEO audit
- 🔗 View internal links
- 📊 View in cluster
- 🗑️ Delete

**Bulk Actions:**
- 📤 Publish multiple
- 📅 Schedule batch
- 🔄 Refresh selected
- 🗑️ Delete selected

---

## Publishing & Scheduling

### Publish Immediately

**From Post Details:**
1. Click "Publish Now" button
2. Choose publication date (or today)
3. Confirm
4. ✅ Blog sent to your website via webhook
5. Search Console will index it

**Takes:** < 5 seconds

### Schedule for Later

**If you have scheduling enabled:**

1. Click "Schedule for Later"
2. Choose date & time (future only)
3. Select cadence (one-time or recurring)
4. Set reminders
5. System publishes automatically

**Scheduling Options:**
- One-time: publish once
- Daily: every day at same time
- Weekly: specific day/time
- Monthly: specific date

### Batch Publishing

**Publish multiple posts:**

1. Go to Posts page
2. Select posts (checkboxes)
3. Click "Publish Selected" button
4. Choose dates or schedule
5. Confirm

**Tip:** Stagger publications so search engines crawl them separately.

### Check Publishing Status

**In Overview or Posts:**
- 📄 Draft = editing
- 🔍 Review = awaiting approval
- ✅ Approved = ready to publish
- 📅 Scheduled = queued for auto-publish
- ✨ Published = live on site

---

## Settings & Configuration

### Path: AI Blogger > Settings

4 main configuration tabs:

### 1. Brand Voice

**Set how AI writes:**

| Setting | Options | Example |
|---------|---------|---------|
| **Tone** | Professional, Casual, Educational, Sales | "Professional" |
| **Audience** | Beginners, Intermediate, Advanced | "Intermediate" |
| **CTA Style** | Soft, Direct, Urgent | "Direct" |
| **Banned Terms** | Comma-separated | "cheap, unethical, spam" |

**Effect:** All new blogs inherit these defaults (can override per-blog).

### 2. Publishing

**Control how blogs are delivered:**

| Setting | Purpose |
|---------|---------|
| **Target Type** | Webhook or Manual export |
| **Webhook URL** | Where blogs are sent |
| **Active Toggle** | Enable/disable webhooks |
| **Retry Attempts** | How many times to retry failed webhook |
| **Timeout** | Max seconds to wait for response |

**Setup Webhook:**
1. Go to Publishing tab
2. Select "Webhook" from dropdown
3. Enter your endpoint URL: `https://your-site.com/api/webhooks/blog-published`
4. Click "Test" to verify
5. Toggle "Active" ON

### 3. SEO Rules

**Quality requirements:**

| Rule | Default | Adjustable? |
|------|---------|-------------|
| Min word count | 300 | ✅ Yes |
| Max word count | 5000 | ✅ Yes |
| Min SEO score | 80 | ✅ Yes |
| Require internal links | Yes | ✅ Yes |
| Require meta title | Yes | ✅ Yes |
| Require meta description | Yes | ✅ Yes |
| Require image alt text | Yes | ✅ Yes |
| Require schema markup | Yes | ✅ Yes |

**More strict = higher quality but slower approval.**

### 4. Automation

**Schedule recurring blog generation:**

**Create Schedule:**
1. Click "New Schedule" button
2. Name: e.g., "Weekly Blog Run"
3. Cadence: Daily, Weekly, Monthly
4. Time: When to generate
5. Topics: Keywords to focus on (auto-rotated)
6. Status: Active or Draft
7. Max retries: If generation fails

**Once active:**
- ✅ Automatically generates blog at scheduled time
- ✅ Runs validation checks
- ✅ Moves to review queue
- ✅ Notifies you when done
- ✅ Can manually approve from dashboard

**Monitoring:**
- See last run status
- View run history (60 latest)
- Check for errors
- Manually trigger run
- Pause/edit schedule

---

## Refresh Queue

### What is a Refresh?

A **refresh** is updating an existing published blog post to improve SEO performance.

**When to refresh:**
- ❌ Rankings dropped
- ↓ CTR declining
- 📉 Impressions falling
- 🤔 Content outdated
- 🔗 Missing new internal links

### View Refresh Queue

**Path:** AI Blogger > Overview > "View Full Queue"
**Or:** AI Blogger > Refresh Queue

### Refresh Candidates

Each candidate shows:

| Info | Meaning |
|------|---------|
| **Refresh Score** | 0-100, higher = more urgent |
| **Urgency** | Critical, High, Medium, Low |
| **Reason** | Why it needs refresh |
| **Current Metrics** | Clicks, impressions, CTR, position |
| **Change** | ↑ Improving or ↓ Declining |

### Filter & Sort

**Filters:**
- Urgency: Critical, High, Medium, Low
- Reason: Low CTR, Position decay, etc.
- Sort by: Refresh score, click loss, impression loss

**Sorting:**
- Refresh score (highest first)
- Click loss (biggest drop)
- Impression loss (biggest drop)
- Sync lag (oldest data)

### Refresh a Post

**Step 1:** Click post in queue
**Step 2:** View current content & metrics
**Step 3:** AI analyzes what changed
**Step 4:** AI generates updated content
**Step 5:** Review changes
**Step 6:** Approve & publish
**Step 7:** Updated version sent to your site

**Duration:** 5-10 minutes

---

## Content Clusters

### What is a Cluster?

A **cluster** is a group of related blog posts linked by topic:

```
┌─────────────────────────────────────┐
│ PILLAR POST                         │
│ "Complete SEO Guide"                │
│ (Comprehensive overview)            │
└──────────┬──────────────────────────┘
           │
    ┌──────┼──────┐
    ↓      ↓      ↓
  Post1  Post2  Post3
  "Keyword   "Link    "Technical
   Research" Building" SEO"
  (Supporting posts)
```

**Benefits:**
- ✅ Better internal linking
- ✅ Improved topic authority
- ✅ Higher rankings
- ✅ Better user experience

### View Clusters

**Path:** AI Blogger > Clusters

### Cluster Dashboard

Shows:

**Summary:**
- Total clusters
- Coverage % (posts in clusters)
- Average cluster size
- Orphaned posts (not in any cluster)

**Cluster Cards:**
| Info | Shows |
|------|-------|
| **Health** | ✅ Strong, 🟡 Developing, ❌ Weak, 🔘 Orphaned |
| **Pillar Post** | Main topic name |
| **Post Count** | How many supporting posts |
| **Metrics** | SEO scores, word counts, links |

**Color Legend:**
- 🟢 Green (Strong): 3+ posts, SEO 75+
- 🟠 Orange (Developing): 1-2 posts, SEO 50-75
- 🔴 Red (Weak): 1 post, SEO < 50
- ⚫ Gray (Orphaned): Not in any cluster

### How Clusters Are Created

**AI Blogger automatically:**

1. Analyzes your content topics
2. Identifies pillar posts (broad topics)
3. Links supporting posts (specific topics)
4. Scores internal link quality
5. Suggests new posts to fill gaps

**You control:**
- Which posts are pillars
- Which are supporting
- When to create new posts to fill cluster gaps

---

## Key Metrics

### On Overview Page

**5 Main Metrics:**

```
📄 Draft Queue          ← Posts being written
✨ Ready To Review      ← Awaiting your approval
📅 Active Schedules     ← Automation runs
✅ Published Posts      ← Live on your site
🔄 Refresh Queue        ← Posts needing updates
```

### SEO Score Breakdown

**Measured 0-100:**

| Score | Quality | Status |
|-------|---------|--------|
| 80+ | Excellent | ✅ Can publish |
| 70-79 | Good | ✅ Can publish (review recommended) |
| 60-69 | Fair | ⚠️ Needs fixes |
| < 60 | Poor | ❌ Fix before publishing |

**Includes:**
- Keyword usage
- Content length
- Readability
- Meta tags
- Schema markup
- Internal links
- Image optimization

### Performance Sync

**Search Console Connection:**

| Status | Meaning |
|--------|---------|
| ✅ Connected | Syncing data |
| 🟡 Stale | Data > 24 hours old |
| ❌ Failed | Connection error (check settings) |

**Shows:**
- Last successful sync
- Last failed sync
- Latest snapshot date
- Published post count

### Refresh Metrics

**In Refresh Queue:**

| Card | Shows |
|------|-------|
| **Critical/High** | Count of urgent refreshes |
| **Low CTR/Decay** | Posts losing traffic |
| **Sync Gaps** | Missing or stale data |
| **Latest Movers** | Recent changes (up/down) |

---

## Common Workflows

### Workflow 1: One-Time Blog Creation

```
1. AI Blogger > Generate
2. Fill brief
3. Wait for generation
4. Review content
5. Fix SEO issues (if any)
6. Approve
7. Publish Now
8. ✅ Blog live on site
```

**Time:** 20-30 minutes

### Workflow 2: Scheduled Blog Generation

```
1. AI Blogger > Settings > Automation
2. Create schedule (e.g., "Weekly SEO posts")
3. Set cadence (Daily, Weekly, Monthly)
4. Activate
5. System generates automatically
6. Go to Posts queue
7. Review each week
8. Approve & publish
9. ✅ Continuous blog content
```

**Time:** 5 min setup, then 10 min/week review

### Workflow 3: Content Refresh

```
1. AI Blogger > Refresh Queue
2. Click post losing traffic
3. Review refresh suggestion
4. AI generates updated version
5. Review changes
6. Approve
7. Publish
8. ✅ Rankings recover
```

**Time:** 10-15 minutes per refresh

### Workflow 4: Build Content Cluster

```
1. AI Blogger > Generate (Pillar Post)
   - "Complete SEO Guide"
2. Approve & publish
3. Generate Supporting Posts
   - "Keyword Research Guide"
   - "Link Building Strategies"
   - "Technical SEO Checklist"
4. AI auto-links them (internal links)
5. View in AI Blogger > Clusters
6. ✅ Topic authority built
```

**Time:** 1-2 days (spread across time)

---

## Tips & Best Practices

### ✅ DO

- ✅ Use consistent tone & audience
- ✅ Set up webhooks before publishing
- ✅ Review generated content before publishing
- ✅ Create clusters around main topics
- ✅ Monitor refresh queue weekly
- ✅ Use schedules for consistent content
- ✅ Check Search Console integration
- ✅ Edit internal links if needed

### ❌ DON'T

- ❌ Don't publish without SEO review
- ❌ Don't ignore validation errors
- ❌ Don't leave webhook unconfigured
- ❌ Don't forget to approve clustered posts
- ❌ Don't let schedule fail without fixing
- ❌ Don't publish too many blogs same day (overwhelming)
- ❌ Don't skip the refresh queue

---

## FAQ

**Q: How long does blog generation take?**
A: 10-15 minutes depending on research depth.

**Q: Can I edit blogs after publishing?**
A: Yes, edit on your website directly or regenerate a new version.

**Q: What if my webhook fails?**
A: AI Blogger retries 3 times. Use "Manual Resend" in settings if needed.

**Q: Do I need to do internal linking manually?**
A: No, AI Blogger does it automatically based on your content clusters.

**Q: Can I generate multiple blogs at once?**
A: Not in parallel, but you can queue them and auto-schedule.

**Q: What's the best SEO score I can get?**
A: Typically 85-95 with good topic research and editing.

**Q: How often should I refresh posts?**
A: Monthly for high-traffic posts, quarterly for others.

**Q: Will blogs rank immediately?**
A: No, Google takes 2-4 weeks to index and rank new content.

---

**Got questions?** Check the [Webhook API Documentation](./AI_BLOGGER_WEBHOOK_API_DOCS.md) or contact support.

