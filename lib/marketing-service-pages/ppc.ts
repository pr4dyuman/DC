import type { ServicePageData } from "./index";

// Content for /services/ppc. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "ppc",
    path: "/services/ppc",
    title: "Pay-Per-Click (PPC) Advertising",
    titleSize: "md",
    eyebrow: "Immediate results",
    summary: "Paid ads on Google, Meta and LinkedIn put your business in front of people who are ready to buy, from day one. We plan the campaigns, write the ads, keep tuning bids and budgets, and report on leads, sales and return on ad spend.",
    cardText: "Get immediate visibility with targeted ads on Google, Bing, and social media. We craft campaigns that maximize ROI and minimize wasted spend.",
    highlights: [
        "Google, Meta and LinkedIn ads",
        "Tracking checked before spend scales",
        "Weekly and monthly reports",
        "No lock-ins"
    ],
    image: {
        src: "/ppc1.svg",
        alt: "Pay-Per-Click (PPC) Advertising illustration"
    },
    ctaLabel: "Get a free ads plan",
    resultsLabel: "See ad campaigns",
    audience: [
        {
            title: "Businesses that need leads now",
            text: "When you want enquiries this month, not in six months, search ads put you in front of buyers right away."
        },
        {
            title: "Online stores",
            text: "Shopping, display and marketplace campaigns that bring buyers to your products and track every sale."
        },
        {
            title: "B2B companies",
            text: "LinkedIn and search campaigns that reach decision-makers and fill your sales pipeline."
        }
    ],
    deliverables: [
        {
            title: "Campaign planning",
            text: "Research, campaign structure and budgets planned around your goals.",
            icon: "target",
            items: [
                "Comprehensive keyword research and competitor analysis",
                "Custom campaign architecture tailored to your goals",
                "Audience segmentation and persona targeting",
                "Budget allocation strategies for maximum impact",
                "Conversion funnel mapping and optimization"
            ]
        },
        {
            title: "Ads & copywriting",
            text: "Ads that match what people search for and give them a reason to click.",
            icon: "pen",
            items: [
                "High-converting ad copy that speaks to user intent",
                "Eye-catching display ads and responsive search ads",
                "A/B testing of headlines, descriptions, and CTAs",
                "Ad extensions setup (sitelinks, callouts, structured snippets)",
                "Landing page recommendations for better Quality Scores"
            ]
        },
        {
            title: "Platforms we run",
            text: "Google, Microsoft, Meta, LinkedIn and Amazon: wherever your buyers are.",
            icon: "layout",
            items: [
                "Google Ads (Search, Display, Shopping, YouTube)",
                "Microsoft Advertising (Bing Ads)",
                "Facebook & Instagram Ads",
                "LinkedIn Ads for B2B targeting",
                "Amazon Advertising and other e-commerce platforms"
            ]
        },
        {
            title: "Bidding & optimisation",
            text: "Smart bids and negative keywords that cut wasted spend.",
            icon: "sliders",
            items: [
                "Automated and manual bidding strategies",
                "Real-time bid adjustments based on performance",
                "Device, location, and time-of-day bid optimization",
                "Negative keyword management to reduce wasted spend",
                "Quality Score improvement for lower CPCs"
            ]
        },
        {
            title: "Tracking & reporting",
            text: "No vanity metrics: reports on leads, sales and return on ad spend.",
            icon: "chart",
            items: [
                "Custom dashboards tracking key performance metrics",
                "Weekly and monthly performance reports with actionable insights",
                "Conversion tracking and attribution modeling",
                "ROI and ROAS (Return on Ad Spend) analysis",
                "Ongoing recommendations for campaign improvements"
            ]
        }
    ],
    process: [
        {
            title: "Research",
            description: "Analyze goals, competitors, search demand, audience segments, channel fit, budgets, and conversion paths."
        },
        {
            title: "Setup",
            description: "Build campaign structure, ad groups, keywords, audiences, negative keywords, tracking, and landing page recommendations."
        },
        {
            title: "Launch",
            description: "Publish campaigns with clear testing priorities across copy, creative, bids, placements, devices, and locations."
        },
        {
            title: "Optimize",
            description: "Review performance data, reduce wasted spend, improve quality scores, refine targeting, and scale what converts."
        }
    ],
    expectations: [
        "Conversion tracking is checked before budget is scaled.",
        "Reports focus on leads, revenue, ROAS, CPL, and wasted spend, not vanity clicks.",
        "Search terms, audiences, placements, and creatives are reviewed for ongoing optimization.",
        "Paid traffic recommendations are connected to landing page UX and conversion quality."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "ads"
        ],
        title: "Ad Campaigns",
        linkLabel: "See all ad campaigns"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids PPC advertising services?",
            answer: "Our PPC services can include campaign strategy, keyword and audience research, ad copywriting, creative testing, conversion tracking, bid management, landing page recommendations, and performance reporting."
        },
        {
            question: "Which advertising platforms do you manage?",
            answer: "We can manage campaigns across Google Ads, Microsoft Advertising, Meta ads, LinkedIn ads, YouTube, Shopping, Display, and other paid channels when they fit the business goal."
        },
        {
            question: "How quickly can PPC campaigns start generating traffic?",
            answer: "PPC can start sending traffic as soon as campaigns are approved and live. Strong results still depend on targeting, budget, landing page quality, conversion tracking, and ongoing optimization."
        },
        {
            question: "How do you measure PPC success?",
            answer: "We track metrics that connect ad spend to business outcomes, including conversions, cost per lead, conversion rate, ROAS, wasted spend, lead quality, and campaign-level trends."
        }
    ],
    relatedLinks: [
        {
            title: "Web Development",
            href: "/services/web-development",
            description: "Build landing pages that turn paid clicks into real inquiries."
        },
        {
            title: "SEO Services",
            href: "/services/seo",
            description: "Balance paid acquisition with compounding organic visibility."
        },
        {
            title: "Social Media Marketing",
            href: "/services/social-media-marketing",
            description: "Connect paid campaigns with consistent social demand creation."
        }
    ],
    relatedArticles: [
        {
            title: "Building Data-Driven PPC Campaigns",
            href: "/blog/building-data-driven-ppc-campaigns-the-modern-roi-framework",
            category: "Campaign ROI",
            description: "Build transparent, data-driven PPC campaigns that pair clean data analysis with performance creative."
        },
        {
            title: "What PPC Services Include: The Video Edge",
            href: "/blog/what-is-included-in-ppc-advertising-services-the-video-edge",
            category: "PPC Deliverables",
            description: "See what PPC advertising services include, from video-integrated deliverables to platform management."
        },
        {
            title: "Local Services Ads Vs Google Business Profile For Plumbers",
            href: "/blog/local-service-ads-vs-google-business-plumber-leads",
            category: "Local Leads",
            description: "Compare Local Services Ads and Google Business Profile for emergency repairs and scheduled installations."
        }
    ],
    closing: {
        title: "Ready to scale paid acquisition?",
        text: "Let's discuss how our PPC strategy can help you reach qualified buyers, reduce wasted spend, and turn more clicks into conversions."
    },
    seo: {
        name: "PPC Advertising Services",
        description: "Launch performance-focused PPC campaigns with Digital Corvids across Google, Bing, and social platforms, with testing, tracking, bid management, and ROI reporting.",
        serviceType: "Pay-Per-Click Advertising",
        breadcrumbName: "PPC Advertising"
    }
};

export default page;
