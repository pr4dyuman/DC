import type { PortfolioCaseStudy } from "@/lib/marketing-portfolio";

/**
 * SAMPLE case studies: invented clients and numbers that show how each service
 * looks in the portfolio. They appear only on the noindex preview at
 * /portfolio/preview and never on the public portfolio or service pages.
 *
 * To publish a real case study, copy one of these into the published list in
 * lib/marketing-portfolio.ts, replace every word and number with the client's
 * real results and images, and set status to "published".
 */

const SAMPLE_DIR = "/portfolio/samples";

function sampleImage(path: string, width: number, height: number, alt: string) {
    return { src: `${SAMPLE_DIR}/${path}`, width, height, alt: `Sample: ${alt}` };
}

export const MARKETING_SAMPLE_CASE_STUDIES: PortfolioCaseStudy[] = [
    {
        slug: "sample-seo-furniture-store",
        status: "sample",
        client: "Furniture store",
        industry: "Furniture retail",
        location: "Jaipur",
        services: ["seo"],
        period: "Dec 2025 – Nov 2026",
        featured: true,
        headline: { value: "+402%", label: "Organic clicks in 12 months" },
        summary:
            "A furniture store that relied on walk-ins now gets most of its new enquiries from Google search.",
        kpis: [
            { value: "#3", label: "for “wooden furniture jaipur”" },
            { value: "3.1×", label: "enquiries from search" },
            { value: "24", label: "category pages rewritten" },
        ],
        proof: {
            type: "seo",
            metric: "Organic clicks per month",
            points: [
                { label: "Dec", value: 820 },
                { label: "Jan", value: 790 },
                { label: "Feb", value: 860 },
                { label: "Mar", value: 910 },
                { label: "Apr", value: 1180 },
                { label: "May", value: 1530 },
                { label: "Jun", value: 1960 },
                { label: "Jul", value: 2410 },
                { label: "Aug", value: 2890 },
                { label: "Sep", value: 3320 },
                { label: "Oct", value: 3710 },
                { label: "Nov", value: 4120 },
            ],
            startIndex: 3,
            startLabel: "SEO work starts",
            report: {
                title: "Google Search Console · monthly",
                metrics: [
                    { label: "Clicks", before: "820", after: "4,120" },
                    { label: "Impressions", before: "39k", after: "89.6k" },
                    { label: "Click-through rate", before: "2.1%", after: "4.6%" },
                    { label: "Average position", before: "31.4", after: "8.2" },
                ],
                impressions: [
                    { label: "Dec", value: 39000 },
                    { label: "Jan", value: 37600 },
                    { label: "Feb", value: 40200 },
                    { label: "Mar", value: 41500 },
                    { label: "Apr", value: 47000 },
                    { label: "May", value: 54800 },
                    { label: "Jun", value: 61900 },
                    { label: "Jul", value: 68700 },
                    { label: "Aug", value: 74600 },
                    { label: "Sep", value: 79800 },
                    { label: "Oct", value: 84900 },
                    { label: "Nov", value: 89600 },
                ],
                markers: [
                    { index: 3, label: "01" },
                    { index: 4, label: "02" },
                    { index: 6, label: "03" },
                ],
            },
            keywords: [
                { term: "wooden furniture jaipur", before: 34, after: 3 },
                { term: "sheesham dining table", before: null, after: 7 },
                { term: "buy sofa online rajasthan", before: 58, after: 9 },
            ],
            serp: {
                siteName: "Furniture store",
                url: "yourstore.in › dining-tables",
                title: "Solid Wood Dining Tables in Jaipur | Free Delivery",
                description:
                    "6-seater and 8-seater sheesham dining tables. Visit the showroom or order online with free delivery across Jaipur.",
                position: 3,
            },
        },
        story: {
            challenge:
                "The store had a busy showroom and good reviews, but its website sat on page three for most furniture searches in Jaipur. Category pages had little text, slow images, and half of them were not indexed.",
            steps: [
                {
                    title: "Fixed the technical basics",
                    when: "Mar 2026",
                    text: "Compressed images, repaired broken links and submitted a clean sitemap, so Google could index every category page.",
                },
                {
                    title: "Rewrote pages around real searches",
                    when: "Apr – Jun 2026",
                    text: "Mapped 120 local searches to 24 category pages and rewrote each one with the sizes, woods and prices buyers ask about.",
                },
                {
                    title: "Built local trust",
                    when: "Jun 2026",
                    text: "Completed the Google Business Profile, listed the showroom in local directories and set up a simple way to ask customers for reviews.",
                },
                {
                    title: "Reported every month",
                    when: "Every month",
                    text: "Shared clicks, rankings and enquiries each month and reworked the pages that moved slowest.",
                },
            ],
            result:
                "Organic clicks grew from 820 to 4,120 a month, and the store now ranks in the top three for its main search terms.",
            source: "Google Search Console, December 2025 to November 2026",
        },
        testimonial: {
            quote: "We used to wait for walk-ins. Now most new customers tell us they found us on Google.",
            name: "Store owner",
            role: "Furniture store, Jaipur",
        },
        insights: [
            {
                type: "search-results",
                title: "The search page now",
                note: "Google results for “wooden furniture jaipur”: first in the map pack and third in the organic results.",
                query: "wooden furniture jaipur",
                position: 3,
                result: {
                    siteName: "Furniture store",
                    url: "yourstore.in › dining-tables",
                    title: "Solid Wood Dining Tables in Jaipur | Free Delivery",
                    description:
                        "6-seater and 8-seater sheesham dining tables. Visit the showroom or order online with free delivery across Jaipur.",
                },
                mapPack: { name: "Furniture store", rating: 4.8, reviews: 126, detail: "Furniture store · Open until 8 pm" },
            },
            {
                type: "rank-movement",
                title: "Keyword positions, before and after",
                note: "Position on Google in December 2025 and November 2026, with monthly searches. Page one is positions 1 to 10.",
                keywords: [
                    { term: "furniture showroom near me", before: 22, after: 2, volume: "5.4k" },
                    { term: "wooden furniture jaipur", before: 34, after: 3, volume: "1.9k" },
                    { term: "solid wood bed jaipur", before: 41, after: 4, volume: "720" },
                    { term: "sheesham dining table", before: null, after: 7, volume: "2.4k" },
                    { term: "buy sofa online rajasthan", before: 58, after: 9, volume: "880" },
                    { term: "teak wood wardrobe", before: 77, after: 12, volume: "1.3k" },
                ],
            },
            {
                type: "score-rings",
                wide: true,
                title: "Page speed on mobile, before and after",
                note: "Lighthouse scores for the dining tables page, out of 100.",
                scores: [
                    { label: "Performance", before: 38, after: 92 },
                    { label: "Accessibility", before: 81, after: 97 },
                    { label: "Best practices", before: 75, after: 100 },
                    { label: "SEO", before: 69, after: 100 },
                ],
            },
        ],
    },
    {
        slug: "sample-social-cafe",
        status: "sample",
        client: "Neighbourhood café",
        industry: "Café",
        location: "Jaipur",
        services: ["social"],
        period: "May – Oct 2026",
        headline: { value: "+361%", label: "Instagram followers in 6 months" },
        summary: "A café turned its Instagram into the main way new customers find it and book tables.",
        kpis: [
            { value: "184k", label: "plays on the best reel" },
            { value: "96", label: "DM enquiries a month" },
        ],
        proof: {
            type: "social",
            platform: "Instagram",
            handle: "@yourcafe",
            profile: {
                name: "Neighbourhood café",
                bio: ["Coffee, bakes and long mornings.", "Open daily, 7:30 am to 10 pm."],
                action: "Book a table",
            },
            avatar: sampleImage("social-cafe/avatar.webp", 200, 200, "café profile picture"),
            posts: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) =>
                sampleImage(`social-cafe/post-${index}.webp`, 600, 600, `café Instagram post ${index}`),
            ),
            profileStats: [
                { label: "posts", value: "214" },
                { label: "followers", value: "9,870" },
                { label: "following", value: "312" },
            ],
            growth: {
                label: "Followers",
                points: [
                    { label: "May", value: 2140 },
                    { label: "Jun", value: 2600 },
                    { label: "Jul", value: 3500 },
                    { label: "Aug", value: 5200 },
                    { label: "Sep", value: 7400 },
                    { label: "Oct", value: 9870 },
                ],
            },
        },
        story: {
            challenge:
                "The café posted now and then, mostly phone photos of the menu. Followers had stalled at about 2,000 and few posts reached anyone beyond the regulars.",
            steps: [
                {
                    title: "Set a look and a rhythm",
                    when: "May 2026",
                    text: "Agreed one colour palette and four posts a week, planned a month ahead.",
                },
                {
                    title: "Made reels from everyday moments",
                    when: "From Jun 2026",
                    text: "Latte art, morning baking and closing-time prep, filmed in under ten minutes a day.",
                },
                {
                    title: "Partnered with neighbours",
                    when: "Aug 2026",
                    text: "Joint posts with a nearby bookshop and a weekend running club brought in new local followers.",
                },
                {
                    title: "Answered every message",
                    when: "Every day",
                    text: "Replies within the hour turned questions about the menu into table bookings.",
                },
            ],
            result:
                "Followers grew from 2,140 to 9,870 in six months, and direct messages became the café's busiest booking channel.",
            source: "Instagram Insights, May to October 2026",
        },
        insights: [
            {
                type: "post-stats",
                title: "The best reel",
                note: "A 60-second latte art reel, posted in August.",
                image: sampleImage("social-cafe/post-1.webp", 600, 600, "latte art reel cover"),
                caption: "60 seconds of latte art",
                headline: { value: "184k", label: "plays" },
                stats: [
                    { value: "12.4k", label: "likes" },
                    { value: "386", label: "comments" },
                    { value: "2.1k", label: "shares" },
                    { value: "5.6k", label: "saves" },
                ],
            },
            {
                type: "message-inbox",
                title: "A Saturday in the inbox",
                note: "Questions that used to go unanswered now turn into bookings.",
                messages: [
                    { from: "Aditi", text: "Hi! Table for 4 at 7 tonight?", time: "6:12 pm", reply: "Replied in 4 min" },
                    { from: "Rahul", text: "Saw the reel. Do you do oat milk?", time: "4:40 pm", reply: "Replied in 6 min" },
                    { from: "Meera", text: "Can we book the corner table for a birthday on Sunday?", time: "2:05 pm", reply: "Replied in 9 min" },
                    { from: "Kabir", text: "Is the croissant eggless?", time: "11:31 am", reply: "Replied in 3 min" },
                ],
                summary: [
                    { value: "96", label: "enquiries a month" },
                    { value: "8 min", label: "median reply time" },
                ],
            },
            {
                type: "bars",
                wide: true,
                title: "Accounts reached each month",
                note: "Unique accounts that saw the café's posts and reels.",
                bars: [
                    { label: "May", value: 8200 },
                    { label: "Jun", value: 14600 },
                    { label: "Jul", value: 26300 },
                    { label: "Aug", value: 48900 },
                    { label: "Sep", value: 71400 },
                    { label: "Oct", value: 96100 },
                ],
            },
        ],
    },
    {
        slug: "sample-ads-dental-clinic",
        status: "sample",
        client: "Dental clinic",
        industry: "Healthcare",
        location: "Jaipur",
        services: ["ads"],
        period: "Jun – Sep 2026",
        headline: { value: "−67%", label: "Cost per lead in 4 months" },
        summary: "Google Ads for a dental clinic, rebuilt around treatment searches and same-day appointments.",
        kpis: [
            { value: "142", label: "leads a month, up from 38" },
            { value: "5.4×", label: "return on ad spend" },
        ],
        proof: {
            type: "ads",
            platform: "Google Ads",
            ad: {
                siteName: "Dental clinic",
                url: "yourclinic.in",
                headline: "Painless Root Canal in Jaipur | Same-Day Appointments",
                description: "Experienced dentists, clear fees and EMI options. Book a check-up in two minutes.",
                sitelinks: ["Book online", "Fees", "Our dentists", "Location"],
            },
            comparisons: [
                { label: "Cost per lead", before: 640, after: 210, format: "inr", lowerIsBetter: true },
                { label: "Leads per month", before: 38, after: 142, format: "number" },
            ],
        },
        story: {
            challenge:
                "The clinic paid for broad searches like “dentist” and sent every click to its home page. Leads were expensive, and many came from outside the city.",
            steps: [
                {
                    title: "Narrowed the targeting",
                    when: "Week 1",
                    text: "Moved budget to treatment searches and a 12 km radius around the clinic.",
                },
                {
                    title: "Built a page per treatment",
                    when: "Weeks 2 – 4",
                    text: "Root canal, implant and braces pages with fees, photos of the clinic and a two-minute booking form.",
                },
                {
                    title: "Tracked every call and form",
                    when: "Week 3",
                    text: "Counted calls and bookings as conversions, so bids followed patients instead of clicks.",
                },
                {
                    title: "Cut what did not convert",
                    when: "Every week",
                    text: "Added negative keywords and adjusted bids every week.",
                },
            ],
            result: "Cost per lead fell from ₹640 to ₹210 while monthly leads grew from 38 to 142.",
            source: "Google Ads, June to September 2026",
        },
        insights: [
            {
                type: "search-results",
                title: "The ad on the search page",
                note: "The top result for “root canal treatment jaipur”, with sitelinks and a call button.",
                query: "root canal treatment jaipur",
                position: 1,
                result: {
                    siteName: "Dental clinic",
                    url: "yourclinic.in › root-canal",
                    title: "Painless Root Canal in Jaipur | Same-Day Appointments",
                    description: "Experienced dentists, clear fees and EMI options. Book a check-up in two minutes.",
                },
                ad: { sitelinks: ["Book online", "Fees", "Our dentists", "Location"], call: "Call" },
            },
            {
                type: "landing-page",
                title: "One page per treatment",
                note: "Each ad leads to the page for that treatment, with the fee and a short form.",
                url: "yourclinic.in/root-canal",
                eyebrow: "Root canal treatment",
                heading: "Painless root canal, often in one visit",
                price: "From ₹4,500 · EMI available",
                points: ["Same-day appointments", "Digital X-ray included", "Clear fees, no surprises"],
                fields: ["Your name", "Phone number", "Preferred day"],
                cta: "Book in 2 minutes",
            },
            {
                type: "weekly-combo",
                wide: true,
                title: "Leads up, cost per lead down",
                note: "Leads each week (bars) and cost per lead (line), June to September.",
                labels: ["Jun", "", "", "", "Jul", "", "", "", "Aug", "", "", "", "Sep", "", "", ""],
                bars: { label: "Leads", values: [8, 9, 11, 10, 13, 16, 18, 21, 24, 26, 28, 30, 33, 35, 36, 38] },
                line: {
                    label: "Cost per lead",
                    values: [655, 645, 628, 632, 560, 482, 431, 392, 334, 301, 279, 263, 222, 212, 205, 200],
                    prefix: "₹",
                },
            },
            {
                type: "funnel",
                wide: true,
                title: "From search to the chair",
                note: "June to September. Booked means the patient came in for the appointment.",
                stages: [
                    { label: "Impressions", value: 186400 },
                    { label: "Clicks", value: 7950 },
                    { label: "Leads", value: 356 },
                    { label: "Appointments booked", value: 214 },
                ],
            },
        ],
    },
    {
        slug: "sample-video-real-estate",
        status: "sample",
        client: "Real estate developer",
        industry: "Real estate",
        location: "Jaipur",
        services: ["video", "ads"],
        period: "Aug 2026",
        headline: { value: "1.2M", label: "Views across Reels and Shorts" },
        summary: "A 30-second launch film for a residential tower, cut for Reels, Shorts and paid social.",
        kpis: [
            { value: "41%", label: "average view completion" },
            { value: "320", label: "site visits booked" },
        ],
        proof: {
            type: "video",
            title: "Launch film",
            duration: "0:30",
            poster: sampleImage("video-real-estate/poster.webp", 1280, 720, "residential tower at dusk with its windows lit"),
            stills: [
                sampleImage("video-real-estate/still-1.webp", 640, 360, "tower at dusk"),
                sampleImage("video-real-estate/still-2.webp", 640, 360, "show flat living room"),
                sampleImage("video-real-estate/still-3.webp", 640, 360, "aerial view of the site"),
            ],
            channels: ["Instagram Reels", "YouTube Shorts", "Meta ads"],
        },
        story: {
            challenge:
                "The developer needed site visits for a new tower before the show flat was finished, so photographs alone could not sell it.",
            steps: [
                {
                    title: "Wrote for the first three seconds",
                    when: "Week 1",
                    text: "Opened on the lit tower at dusk, before any text appears.",
                },
                {
                    title: "Shot at golden hour and night",
                    when: "Week 2",
                    text: "Exteriors, drone passes and the finished show flat in one two-day shoot.",
                },
                {
                    title: "Cut three versions",
                    when: "Week 3",
                    text: "30, 15 and 6 seconds, in vertical and wide formats.",
                },
                {
                    title: "Paired it with booking ads",
                    when: "Launch week",
                    text: "Paid social pointed straight to a site-visit form.",
                },
            ],
            result: "1.2 million views in four weeks, with 320 site visits booked through the form.",
            source: "Instagram Insights, YouTube Studio and Meta Ads Manager, August 2026",
        },
        insights: [
            {
                type: "retention",
                wide: true,
                title: "How long people watched",
                note: "Share of viewers still watching at each point of the 30-second cut, across Reels and Shorts.",
                points: [
                    { second: 0, percent: 100 },
                    { second: 3, percent: 71 },
                    { second: 6, percent: 54 },
                    { second: 9, percent: 45 },
                    { second: 12, percent: 39 },
                    { second: 15, percent: 34 },
                    { second: 18, percent: 30 },
                    { second: 21, percent: 28 },
                    { second: 24, percent: 25 },
                    { second: 27, percent: 23 },
                    { second: 30, percent: 21 },
                ],
                hook: { until: 3, label: "The first three seconds" },
            },
            {
                type: "cuts",
                title: "One shoot, three cuts",
                versions: [
                    {
                        label: "30 seconds",
                        ratio: "16:9",
                        image: sampleImage("video-real-estate/poster.webp", 1280, 720, "the tower at dusk, wide frame"),
                        use: "YouTube and the website",
                    },
                    {
                        label: "15 seconds",
                        ratio: "9:16",
                        image: sampleImage("video-real-estate/still-2.webp", 640, 360, "show flat living room, vertical frame"),
                        use: "Reels and Shorts",
                    },
                    {
                        label: "6 seconds",
                        ratio: "1:1",
                        image: sampleImage("video-real-estate/still-3.webp", 640, 360, "aerial view of the site, square frame"),
                        use: "Feed ads",
                    },
                ],
            },
            {
                type: "split",
                title: "Views by channel",
                total: "1.2M",
                note: "All three cuts, four weeks from launch.",
                parts: [
                    { label: "Instagram Reels", value: 640000 },
                    { label: "YouTube Shorts", value: 370000 },
                    { label: "Meta ads", value: 190000 },
                ],
            },
        ],
    },
    {
        slug: "sample-influencer-skincare",
        status: "sample",
        client: "Skincare brand",
        industry: "Beauty",
        services: ["influencer"],
        period: "Jul – Aug 2026",
        headline: { value: "1,380", label: "Sign-ups from creator codes" },
        summary: "A creator campaign for a new serum, tracked from each creator's code to sign-ups.",
        kpis: [
            { value: "3.4M", label: "combined reach" },
            { value: "12", label: "creators" },
        ],
        proof: {
            type: "influencer",
            creators: [
                { name: "Creator one", handle: "@creator.one", followers: "210k", initials: "C1" },
                { name: "Creator two", handle: "@creator.two", followers: "95k", initials: "C2" },
                { name: "Creator three", handle: "@creator.three", followers: "64k", initials: "C3" },
                { name: "Creator four", handle: "@creator.four", followers: "48k", initials: "C4" },
                { name: "Creator five", handle: "@creator.five", followers: "22k", initials: "C5" },
            ],
            content: [
                { ...sampleImage("influencer-skincare/content-1.webp", 540, 960, "serum video by a creator"), handle: "@creator.one" },
                { ...sampleImage("influencer-skincare/content-2.webp", 540, 960, "serum video by a creator"), handle: "@creator.two" },
                { ...sampleImage("influencer-skincare/content-3.webp", 540, 960, "serum video by a creator"), handle: "@creator.three" },
            ],
        },
        story: {
            challenge:
                "The brand launched a new serum with no reviews. Paid ads brought clicks but little trust.",
            steps: [
                {
                    title: "Picked creators by audience",
                    when: "Early Jul",
                    text: "Twelve creators with 20k to 250k followers, matched on skin type and city rather than size.",
                },
                {
                    title: "Gave each creator a code",
                    when: "Mid Jul",
                    text: "A unique discount code per creator showed exactly who drove each sign-up.",
                },
                {
                    title: "Let creators use their own words",
                    when: "Jul – Aug",
                    text: "A one-page brief with the facts and no script.",
                },
                {
                    title: "Reused the best content",
                    when: "Aug 2026",
                    text: "The three best videos became the brand's paid ads, with the creators' permission.",
                },
            ],
            result:
                "1,380 sign-ups from creator codes at ₹38 each, and the three best videos became the brand's top-performing ads.",
            source: "Store discount-code report and creator insights, July to August 2026",
        },
        insights: [
            {
                type: "creator-leaderboard",
                wide: true,
                title: "Sign-ups by creator code",
                note: "The five biggest of the twelve creators. The smaller the audience, the more sign-ups per follower.",
                creators: [
                    { handle: "@creator.one", initials: "C1", followers: 210000, code: "GLOW-ONE", signups: 312 },
                    { handle: "@creator.two", initials: "C2", followers: 95000, code: "GLOW-TWO", signups: 241 },
                    { handle: "@creator.three", initials: "C3", followers: 64000, code: "GLOW-THREE", signups: 198 },
                    { handle: "@creator.four", initials: "C4", followers: 48000, code: "GLOW-FOUR", signups: 176 },
                    { handle: "@creator.five", initials: "C5", followers: 22000, code: "GLOW-FIVE", signups: 133 },
                ],
            },
            {
                type: "funnel",
                title: "From reach to sign-ups",
                note: "July and August, all twelve creators.",
                stages: [
                    { label: "People reached", value: 3400000 },
                    { label: "Code page visits", value: 41200 },
                    { label: "Sign-ups", value: 1380 },
                ],
            },
            {
                type: "bars",
                title: "Cost per sign-up",
                note: "Creator codes against the brand's own ads over the same two months.",
                prefix: "₹",
                bars: [
                    { label: "Creator codes", value: 38 },
                    { label: "Brand's own ads", value: 112 },
                ],
            },
        ],
    },
    {
        slug: "sample-branding-furniture-workshop",
        status: "sample",
        client: "Furniture workshop",
        industry: "Furniture",
        services: ["branding", "web"],
        period: "Mar – Apr 2026",
        featured: true,
        summary: "A new identity for a family furniture workshop moving from word of mouth to online sales.",
        kpis: [
            { value: "3", label: "logo versions" },
            { value: "12", label: "branded items" },
        ],
        proof: {
            type: "branding",
            before: sampleImage("branding-workshop/before.webp", 900, 560, "old logo, a clip-art tree beside blue and red text"),
            after: sampleImage("branding-workshop/after.webp", 900, 560, "new logo, a brass monogram and wordmark on walnut"),
            palette: [
                { name: "Walnut", hex: "#3B2A1E" },
                { name: "Teak", hex: "#8B6442" },
                { name: "Brass", hex: "#C9A45C" },
                { name: "Linen", hex: "#F1E6D4" },
            ],
            applications: [
                sampleImage("branding-workshop/application-1.webp", 800, 600, "business cards"),
                sampleImage("branding-workshop/application-2.webp", 800, 600, "workshop sign"),
                sampleImage("branding-workshop/application-3.webp", 800, 600, "tote bag"),
            ],
        },
        story: {
            challenge:
                "The workshop's logo was a clip-art tree in two clashing colours. It looked nothing like the quality of the furniture and fell apart on signage and packaging.",
            steps: [
                {
                    title: "Started from the craft",
                    when: "Week 1",
                    text: "Took the palette from the workshop itself: walnut, teak, brass and linen.",
                },
                {
                    title: "Drew a monogram and a wordmark",
                    when: "Weeks 2 – 3",
                    text: "A monogram for small spaces and a wordmark for signage and the website.",
                },
                {
                    title: "Tested it on real things",
                    when: "Week 4",
                    text: "Business cards, the workshop sign, tote bags and social posts.",
                },
                {
                    title: "Handed over a one-page guide",
                    when: "Apr 2026",
                    text: "Colours, fonts and logo spacing on a single page the team can follow.",
                },
            ],
            result: "One identity across the workshop, the website and every delivery.",
        },
        insights: [
            {
                type: "logo-versions",
                wide: true,
                title: "Three logo versions",
                note: "The full logo for signs and the website, a stacked version for packaging, and the monogram for small spaces.",
                name: "Furniture Workshop",
                monogram: "FW",
                tagline: "Made to order",
                colors: { dark: "#3B2A1E", mid: "#8B6442", accent: "#C9A45C", light: "#F1E6D4" },
            },
            {
                type: "type-specimen",
                wide: true,
                title: "Two typefaces",
                faces: [
                    { name: "Suifak", role: "Headings and the wordmark", family: "display", sample: "Made to order" },
                    {
                        name: "Glacial Indifference",
                        role: "Body text, labels and prices",
                        family: "text",
                        sample: "Solid wood dining tables, beds and storage, built in our workshop and delivered by our team.",
                    },
                ],
            },
        ],
    },
];

/** Order of the preview grid: real projects mixed with samples so every layout shows. */
export const MARKETING_SAMPLE_PREVIEW_ORDER = [
    "ezyprep",
    "sample-social-cafe",
    "sample-ads-dental-clinic",
    "sample-seo-furniture-store",
    "drifting-wood",
    "sample-video-real-estate",
    "sample-influencer-skincare",
    "design-dwellers",
    "sample-branding-furniture-workshop",
];
