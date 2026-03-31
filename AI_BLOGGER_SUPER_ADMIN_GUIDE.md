# AI Blogger - Super Admin Documentation
**Version**: 1.0
**Last Updated**: 2026-03-30

---

## Overview

This guide is for **super-admin users** who manage multiple agencies using AI Blogger.

---

## Super Admin Features

### Blog Management Dashboard

**Path:** Super Admin > Blogs (Coming Soon)

Will include:

**Blog Overview:**
- Total blogs across all agencies
- Publishing rate
- Average SEO scores
- Agency breakdown

**Blog Quality Monitor:**
- Blogs missing critical metadata
- SEO validation failures
- Published posts with issues
- Orphaned posts (no cluster)

**Agency Blog View:**
- Filter by agency
- View each agency's blogs
- Quick actions (edit, delete, republish)
- Webhook delivery status

### Global Settings

**Path:** Super Admin > Settings > AI Blogger (Coming Soon)

Will include:

| Setting | Purpose |
|---------|---------|
| **Global blog categories** | Shared categories for all agencies |
| **Publishing policies** | Min SEO score, required fields |
| **Webhook retry policy** | Default retries & timeout |
| **Rate limits** | Max blogs/day per agency |
| **Content rules** | Banned terms, required topics |

---

## Agency Management

### Creating Agency with AI Blogger

When creating a new agency in super admin:

1. **Basic Info**: Name, domain, plan
2. **Features**: Enable "AI Blogger"
3. **Configuration**: Set default settings
4. **Webhook**: Provide their endpoint URL

### Enabling/Disabling AI Blogger

**Per Agency:**

1. Go to Agency Settings
2. Toggle "AI Blogger Feature" ON/OFF
3. If enabled, set:
   - Default target type (webhook/manual)
   - Webhook URL
   - Retry policy
   - Content rules

**Effect:**
- ✅ ON: Agency can access AI Blogger dashboard
- ❌ OFF: AI Blogger hidden from dashboard

### Webhook Management

**Monitor Webhook Status:**

```
Super Admin > Blogs > Agency > Webhook Status
├── Last delivery: 2026-03-30 14:23:45
├── Status: ✅ Success (green)
├── Delivery count: 125
├── Success rate: 98.4%
├── Latest errors: None
└── Manual resend button
```

**If webhook fails:**

1. Click agency
2. View error message
3. Contact their development team
4. Once fixed, click "Test Webhook"
5. If test passes, click "Retry Failed Blogs"

### Bulk Actions

**Manage multiple agencies:**

- Publish all pending blogs across agencies
- Update webhook URLs in bulk
- Reset failed webhook deliveries
- Export blog metrics

---

## Monitoring

### Dashboard Metrics

**Real-time summary:**

```
┌─────────────────────────────────────┐
│ AI BLOGGER NETWORK OVERVIEW         │
├─────────────────────────────────────┤
│ Active Agencies: 24                 │
│ Total Published Blogs: 1,284        │
│ This Month: 156 new                 │
│ Avg SEO Score: 82.3/100             │
│                                     │
│ Publishing Rate:                    │
│ ├─ Daily: 12 blogs/day              │
│ ├─ Est Ranking: 2-4 weeks           │
│ └─ Healthy cadence: ✅              │
│                                     │
│ Webhook Delivery:                   │
│ ├─ Success rate: 98.7%              │
│ ├─ Avg latency: 1.2 seconds         │
│ └─ Failed webhooks: 4               │
│                                     │
│ Content Health:                     │
│ ├─ Clustered posts: 78%             │
│ ├─ With internal links: 92%         │
│ └─ With schema markup: 99%          │
└─────────────────────────────────────┘
```

### Alerts

**Received in Admin Panel:**

1. **Webhook Failures** (Red)
   - Agency X webhook failed 3 times
   - Action: Contact agency, test endpoint

2. **Validation Issues** (Orange)
   - 5 blogs failing SEO validation
   - Action: Review and fix

3. **Low Publishing Rate** (Yellow)
   - Agency X hasn't published in 7 days
   - Action: Check if schedule paused

4. **Performance Alerts** (Blue)
   - 12 blogs eligible for refresh
   - Action: Recommend refresh to agency

---

## Database Queries

### Find Blogs by Agency

```javascript
// MongoDB
db.blogstudioposts.find({ agencyId: "agency-123" })

// Get stats
db.blogstudioposts.aggregate([
  { $match: { agencyId: "agency-123" } },
  { $group: {
    _id: "$status",
    count: { $sum: 1 },
    avgScore: { $avg: "$seoScore" }
  }}
])
```

### Find Failed Webhooks

```javascript
// Get failed webhook logs
db.webhooklogs.find({
  status: "failed",
  createdAt: { $gte: new Date("2026-03-30") }
}).sort({ createdAt: -1 })
```

### Get Publishing Statistics

```javascript
// Blogs published per week
db.blogstudioposts.aggregate([
  { $match: { status: "Published" } },
  { $group: {
    _id: { $week: "$publishedAt" },
    count: { $sum: 1 },
    agencies: { $addToSet: "$agencyId" }
  }},
  { $sort: { _id: -1 } }
])
```

---

## Configuration Management

### Email Notifications

Configure where super-admin alerts go:

```
Settings > Notifications
├── Webhook failures → admin@company.com
├── SEO validation failures → seo-team@company.com
├── Publishing summary → dashboard@company.com
└── Frequency: Daily, Weekly, Monthly
```

### Rate Limiting

**Prevent abuse:**

```
Settings > AI Blogger > Rate Limits
├── Max blogs/day per agency: 10
├── Max concurrent generations: 3
├── Max schedule runs/day: 24
└── Timeout per generation: 30 min
```

### Content Policies

**Global content rules:**

```
Settings > AI Blogger > Content
├── Min word count: 300
├── Max word count: 5000
├── Min SEO score: 80
├── Require internal links: Yes
├── Require schema markup: Yes
└── Banned terms: [spam, unethical, ...]
```

---

## Troubleshooting

### Common Issues

**Issue: Agency says "AI Blogger not visible"**

1. Check if feature enabled in agency settings
2. Confirm agency plan includes AI Blogger
3. Clear browser cache (Ctrl+F5)
4. Ask user to log out and back in

**Issue: Webhook keeps failing**

1. Test endpoint: `curl -X POST https://agency.com/api/webhooks/blog`
2. Check firewall allows outbound to their server
3. Verify endpoint returns 200 status
4. Check their database is accepting data
5. Review error logs in their webhook endpoint

**Issue: Generation always times out**

1. Check if their server is slow
2. Verify they have good internet connection
3. Increase timeout in settings (up to 60 seconds)
4. Ask them to increase their API timeouts

**Issue: SEO score too low**

1. Verify content is long enough (300+ words)
2. Check if keyword is included in title
3. Confirm meta tags are filled
4. Look for duplicate content issues
5. Check schema markup is valid

---

## Performance Tuning

### Database Indexes

**Verify indexes exist for performance:**

```javascript
// Check indexes on BlogStudioPost
db.blogstudioposts.getIndexes()

// Should include:
// ✅ { agencyId: 1 }
// ✅ { status: 1 }
// ✅ { contentClusterId: 1 }
// ✅ { publishedAt: -1 }
// ✅ { createdAt: -1 }

// If missing, create:
db.blogstudioposts.createIndex({ agencyId: 1, status: 1 })
db.blogstudioposts.createIndex({ contentClusterId: 1 })
```

### Webhook Optimization

**To reduce webhook latency:**

1. **Connection pooling**: Reuse HTTP connections
2. **Async processing**: Queue webhook saves, respond 200 immediately
3. **Caching**: Cache agency configs to avoid DB lookups
4. **CDN**: Use CDN for featured images

---

## API Access

### For Integrations

If agencies need **programmatic access** to AI Blogger:

**Create API Keys:**

```
Settings > API Keys > Create New
├── Name: "Integration Key"
├── Permissions: blogstudio:read, blogstudio:write
├── Rate limit: 1000 req/hour
└── Expires: 1 year
```

**Usage:**

```bash
curl https://api.yourdomain.com/api/blogs \
  -H "Authorization: Bearer api_key_xyz"
```

---

## Audit Logging

**Track all actions:**

```
Super Admin > Audit Log
├── Action: publishBlog
├── Agency: ABC Corp
├── User: john@abc.com
├── Blog: "SEO Guide"
├── Status: ✅ Success
├── Timestamp: 2026-03-30 14:23:45
└── IP: 192.168.1.1
```

**Queryable by:**
- Agency
- User
- Action type
- Date range
- Status

---

## Security

### Webhook Signing

**To verify webhooks are from us:**

Send signature in webhook header:

```
X-Webhook-Signature: sha256=abc123...
```

Agencies can verify:

```typescript
import crypto from "crypto";

const signature = req.headers["x-webhook-signature"];
const computed = crypto
  .createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(req.body)
  .digest("hex");

if (signature !== computed) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

### Rate Limiting

**Prevent DoS:**

```
Settings > Security
├── API rate limit: 1000 req/hour per IP
├── Webhook timeout: 30 seconds
├── Concurrent jobs: 3 per agency
└── Max retries: 3
```

---

## Backup & Recovery

### Daily Backups

**Ensure safety:**

```
Backup Schedule
├── Full backup: Daily at 2 AM UTC
├── Incremental: Hourly
├── Retention: 30 days
├── Location: AWS S3
└── Encryption: AES-256
```

**Test restoration:**

```
1. Monthly restore test
2. Verify blog data integrity
3. Check webhook status
4. Test all agencies can access
```

### Disaster Recovery Plan

If data lost:

```
1. Stop all publishing (disable webhooks)
2. Restore from latest backup
3. Notify affected agencies
4. Resume webhooks
5. Ask agencies to check their sites
6. Manual republish if needed
```

---

## SLA & Monitoring

### Uptime Targets

```
Service Level Agreements
├── Platform availability: 99.9%
├── Webhook delivery: 99.5%
├── Generation success: 95%
└── Response time: < 5 seconds
```

### Health Checks

**Monitor every 5 minutes:**

```bash
GET /health
├── Database: ✅ Connected
├── Webhooks: ✅ Queued
├── Generation: ✅ Running
├── Uptime: 99.92%
└── Timestamp: 2026-03-30T14:30:00Z
```

---

## Reporting

### Monthly Reports

Generate for stakeholders:

```
Monthly AI Blogger Report
├── Blogs published: 156
├── Total agencies active: 24
├── Avg SEO score: 82.3
├── Webhook success rate: 98.7%
├── Top keywords: [...]
├── Top agencies: [...]
└── Growth: +12% MoM
```

### Agency Billing

If charging per blog:

```
Settings > Billing
├── Cost per blog: $5
├── Monthly invoices: Auto-generated
├── Overages: $0.50 per extra blog
└── Payment method: Stripe
```

---

## Feature Toggles

**Control features without code changes:**

```
Settings > Feature Flags
├── Enable research: ON
├── Enable clustering: ON
├── Enable refreshes: ON
├── Enable schedules: ON
├── Manual publish: ON
├── Webhook publish: ON
└── Testing mode: OFF
```

---

**Questions?** Contact engineering team or check API docs.

