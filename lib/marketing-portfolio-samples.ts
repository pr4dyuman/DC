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
                    text: "Compressed images, repaired broken links and submitted a clean sitemap, so Google could index every category page.",
                },
                {
                    title: "Rewrote pages around real searches",
                    text: "Mapped 120 local searches to 24 category pages and rewrote each one with the sizes, woods and prices buyers ask about.",
                },
                {
                    title: "Built local trust",
                    text: "Completed the Google Business Profile, listed the showroom in local directories and set up a simple way to ask customers for reviews.",
                },
                {
                    title: "Reported every month",
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
                    text: "Agreed one colour palette and four posts a week, planned a month ahead.",
                },
                {
                    title: "Made reels from everyday moments",
                    text: "Latte art, morning baking and closing-time prep, filmed in under ten minutes a day.",
                },
                {
                    title: "Partnered with neighbours",
                    text: "Joint posts with a nearby bookshop and a weekend running club brought in new local followers.",
                },
                {
                    title: "Answered every message",
                    text: "Replies within the hour turned questions about the menu into table bookings.",
                },
            ],
            result:
                "Followers grew from 2,140 to 9,870 in six months, and direct messages became the café's busiest booking channel.",
            source: "Instagram Insights, May to October 2026",
        },
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
                    text: "Moved budget to treatment searches and a 12 km radius around the clinic.",
                },
                {
                    title: "Built a page per treatment",
                    text: "Root canal, implant and braces pages with fees, photos of the clinic and a two-minute booking form.",
                },
                {
                    title: "Tracked every call and form",
                    text: "Counted calls and bookings as conversions, so bids followed patients instead of clicks.",
                },
                {
                    title: "Cut what did not convert",
                    text: "Added negative keywords and adjusted bids every week.",
                },
            ],
            result: "Cost per lead fell from ₹640 to ₹210 while monthly leads grew from 38 to 142.",
            source: "Google Ads, June to September 2026",
        },
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
            { value: "41%", label: "average watched" },
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
                    text: "Opened on the lit tower at dusk, before any text appears.",
                },
                {
                    title: "Shot at golden hour and night",
                    text: "Exteriors, drone passes and the finished show flat in one two-day shoot.",
                },
                {
                    title: "Cut three versions",
                    text: "30, 15 and 6 seconds, in vertical and wide formats.",
                },
                {
                    title: "Paired it with booking ads",
                    text: "Paid social pointed straight to a site-visit form.",
                },
            ],
            result: "1.2 million views in four weeks, with 320 site visits booked through the form.",
            source: "Instagram Insights, YouTube Studio and Meta Ads Manager, August 2026",
        },
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
                    text: "Twelve creators with 20k to 250k followers, matched on skin type and city rather than size.",
                },
                {
                    title: "Gave each creator a code",
                    text: "A unique discount code per creator showed exactly who drove each sign-up.",
                },
                {
                    title: "Let creators use their own words",
                    text: "A one-page brief with the facts and no script.",
                },
                {
                    title: "Reused the best content",
                    text: "The three best videos became the brand's paid ads, with the creators' permission.",
                },
            ],
            result:
                "1,380 sign-ups from creator codes at ₹38 each, and the three best videos became the brand's top-performing ads.",
            source: "Store discount-code report and creator insights, July to August 2026",
        },
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
                    text: "Took the palette from the workshop itself: walnut, teak, brass and linen.",
                },
                {
                    title: "Drew a monogram and a wordmark",
                    text: "A monogram for small spaces and a wordmark for signage and the website.",
                },
                {
                    title: "Tested it on real things",
                    text: "Business cards, the workshop sign, tote bags and social posts.",
                },
                {
                    title: "Handed over a one-page guide",
                    text: "Colours, fonts and logo spacing on a single page the team can follow.",
                },
            ],
            result: "One identity across the workshop, the website and every delivery.",
        },
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
