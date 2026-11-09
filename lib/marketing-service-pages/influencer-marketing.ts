import type { ServicePageData } from "./index";

// Content for /services/influencer-marketing. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "influencer-marketing",
    path: "/services/influencer-marketing",
    title: "Influencer Marketing",
    eyebrow: "Creators that convert",
    summary: "We match your brand with credible creators, plan campaigns that feel natural, handle briefs and approvals, and track every post to visits and sales.",
    cardText: "Partner with influencers who align with your brand to reach highly engaged audiences.",
    highlights: [
        "Vetted, brand-safe creators",
        "Clear briefs and approvals",
        "Usage rights agreed up front",
        "Tracked to visits and sales"
    ],
    image: {
        src: "/inf1.svg",
        alt: "Influencer Marketing illustration"
    },
    ctaLabel: "Get a free campaign plan",
    resultsLabel: "See influencer campaigns",
    audience: [
        {
            title: "Consumer brands",
            text: "Food, fashion, beauty and lifestyle products that people buy on recommendation."
        },
        {
            title: "Product launches",
            text: "Launches that need many authentic voices talking about you at the same time."
        },
        {
            title: "Brands that want proof",
            text: "Teams that want creator campaigns tracked to visits and sales, not just likes."
        }
    ],
    deliverables: [
        {
            title: "Creator discovery & vetting",
            text: "The right voices for your brand, not just the loudest ones.",
            icon: "users",
            items: [
                "Creator shortlists matched to your audience, niche and campaign goal",
                "Audience quality and engagement authenticity checks",
                "Content quality and past brand collaboration review",
                "Brand safety checks on every shortlisted creator",
                "Nano, micro and larger creators to fit your goals and budget"
            ]
        },
        {
            title: "Campaign strategy & briefs",
            text: "Campaigns that feel natural, with clear briefs and approvals.",
            icon: "clipboard",
            items: [
                "Campaign goals and key messages set before creators are briefed",
                "Creative briefs that leave room for each creator's own voice",
                "Deliverables, deadlines and approval workflows agreed up front",
                "Messaging and compliance guardrails for every post",
                "Posting timelines coordinated across all creators"
            ]
        },
        {
            title: "Content & amplification",
            text: "Creator content that works harder across ads, websites and launches.",
            icon: "repeat",
            items: [
                "Content coordination and approvals with every creator",
                "Paid amplification of the best-performing creator posts",
                "Creator content repurposed for paid social ads",
                "Creator testimonials for landing pages and product launches",
                "Usage rights agreed before content is reused beyond the original post"
            ]
        },
        {
            title: "Analytics & ROI tracking",
            text: "We measure what matters: sales, not just likes.",
            icon: "chart",
            items: [
                "UTM links and discount codes for every creator",
                "Creator-level reporting on reach, engagement and clicks",
                "Website visits, enquiries and sales traced back to creators",
                "Cost per result and campaign ROI",
                "Learnings carried into your next campaign"
            ]
        }
    ],
    process: [
        {
            title: "Match",
            description: "Identify creators whose audience, content style, credibility, and platform strength fit the campaign goal."
        },
        {
            title: "Brief",
            description: "Build clear creative guidelines, deliverables, deadlines, messaging guardrails, usage rights, and approval workflows."
        },
        {
            title: "Launch",
            description: "Coordinate creator content, posting timelines, campaign tracking, UTM links, codes, and paid amplification when needed."
        },
        {
            title: "Measure",
            description: "Review creator performance, engagement quality, traffic, conversions, reuse opportunities, and next campaign learnings."
        }
    ],
    expectations: [
        "Creators are vetted for audience fit, authenticity, engagement quality, and brand safety.",
        "Campaign briefs balance creative freedom with clear messaging and compliance guardrails.",
        "Tracking connects creator posts to website visits, inquiries, sales, and campaign learnings.",
        "Usage rights and repurposing plans are clarified before content is used beyond the original post."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "influencer"
        ],
        title: "Influencer Campaigns",
        linkLabel: "See all influencer work"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids influencer marketing services?",
            answer: "Our influencer marketing services can include creator discovery, audience and engagement checks, campaign strategy, creative briefs, content coordination, approvals, paid amplification, tracking, and ROI reporting."
        },
        {
            question: "How do you choose the right influencers for a brand?",
            answer: "We evaluate audience fit, content quality, engagement authenticity, niche relevance, brand safety, past collaborations, platform strength, and the campaign goal before recommending creators."
        },
        {
            question: "Can influencer content be used in paid ads?",
            answer: "Yes. When usage rights are planned correctly, creator content can be repurposed for paid social, landing pages, testimonials, product launches, and broader campaign assets."
        },
        {
            question: "How do you measure influencer campaign success?",
            answer: "We track metrics such as reach, engagement quality, traffic, conversions, creator-level performance, cost per result, content reuse value, and campaign ROI."
        }
    ],
    relatedLinks: [
        {
            title: "Social Media Marketing",
            href: "/services/social-media-marketing",
            description: "Turn creator activity into sustained social momentum."
        },
        {
            title: "Video Production Ads",
            href: "/services/video-production-ad",
            description: "Create high-quality campaign assets around creator stories."
        },
        {
            title: "PPC Advertising",
            href: "/services/ppc",
            description: "Amplify influencer content with measurable paid campaigns."
        },
        {
            title: "Web Development",
            href: "/services/web-development",
            description: "Send campaign traffic to fast, conversion-ready landing pages."
        }
    ],
    relatedArticles: [
        {
            title: "Influencer Marketing Strategy That Drives Results",
            href: "/blog/influencer-marketing-strategy-that-drives-results-5-step-guide",
            category: "Creator Strategy",
            description: "Build an influencer marketing strategy around creator assets and paid distribution instead of vanity metrics."
        },
        {
            title: "Influencer Contracts And Usage Rights",
            href: "/blog/influencer-collaboration-contracts-usage-rights",
            category: "Usage Rights",
            description: "Draft influencer contracts with clear usage rights, using a framework and checklist to define content ownership."
        },
        {
            title: "Influencer Attribution Beyond Promo Codes",
            href: "/blog/influencer-marketing-attribution-models-beyond-promo-codes",
            category: "Campaign Analytics",
            description: "Use attribution models and multi-touch tracking to measure creator ROI instead of relying on promo codes."
        }
    ],
    closing: {
        title: "Ready to build creator-led demand?",
        text: "Let's discuss how the right creators, content, and tracking can turn audience trust into measurable campaign results."
    },
    seo: {
        name: "Influencer Marketing Services",
        description: "Plan and manage influencer campaigns with Digital Corvids, including creator discovery, campaign strategy, content coordination, performance tracking, and ROI reporting.",
        serviceType: "Influencer Marketing",
        breadcrumbName: "Influencer Marketing"
    }
};

export default page;
