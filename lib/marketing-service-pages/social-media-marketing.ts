import type { ServicePageData } from "./index";

// Content for /services/social-media-marketing. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "social-media-marketing",
    path: "/services/social-media-marketing",
    title: "Social Media Marketing",
    eyebrow: "Build community",
    summary: "We plan, create and run your Instagram, Facebook and LinkedIn so your brand stays visible and your audience turns into customers. Organic posts and paid campaigns work together, and you get a monthly report on what is working.",
    cardText: "Build a loyal audience and amplify your brand's voice across platforms like Facebook, Instagram, LinkedIn, and Pinterest.",
    highlights: [
        "Organic and paid social",
        "Content made for each platform",
        "Monthly performance reports",
        "No hidden fees"
    ],
    image: {
        src: "/smm1.svg",
        alt: "Social Media Marketing illustration"
    },
    ctaLabel: "Get a free social media plan",
    resultsLabel: "See social media results",
    audience: [
        {
            title: "Brands building an audience",
            text: "Businesses that want a consistent, recognisable presence on Instagram, Facebook and LinkedIn."
        },
        {
            title: "Consumer businesses",
            text: "Cafés, salons, shops and online brands whose customers discover them on social media."
        },
        {
            title: "Owners short on time",
            text: "Teams who know social media matters but can't plan, shoot and post every week."
        }
    ],
    deliverables: [
        {
            title: "Organic social growth",
            text: "A steady, on-brand presence on the platforms your customers use.",
            icon: "trending",
            items: [
                "Platform-specific strategy (Instagram, LinkedIn, Facebook, X, Pinterest)",
                "Viral-worthy content calendars (posts, reels, stories, carousels)",
                "Community management and real-time engagement",
                "Hashtag research and trend-jacking (the right way)",
                "User-generated content (UGC) campaigns to amplify authenticity"
            ]
        },
        {
            title: "Paid social ads",
            text: "Targeted Meta, Pinterest and LinkedIn ads that bring leads, not just likes.",
            icon: "megaphone",
            items: [
                "Campaign setup and optimization (Meta Ads, Pinterest Ads, LinkedIn Ads)",
                "Audience segmentation and lookalike targeting",
                "Retargeting campaigns to recover lost leads",
                "A/B testing for ad creatives, copy, and CTAs",
                "Influencer-collaboration ads for trusted social proof"
            ]
        },
        {
            title: "Content & storytelling",
            text: "Photos, videos and captions that tell your brand's story.",
            icon: "camera",
            items: [
                "Creative concept development and mood boards",
                "High-quality photo/video shoots for social feeds",
                "Meme culture integration (brand-safe and relatable)",
                "Caption writing that blends brand voice with platform trends",
                "GIFs, stickers, and AR filters for interactive engagement"
            ]
        },
        {
            title: "Analytics & optimisation",
            text: "Monthly reports that show what's working and what to change.",
            icon: "chart",
            items: [
                "Monthly performance reports (engagement, reach, conversions)",
                "Competitor benchmarking and gap analysis",
                "Sentiment analysis to gauge brand perception",
                "ROI tracking for paid and organic efforts",
                "Platform algorithm updates and pivot strategies"
            ]
        }
    ],
    process: [
        {
            title: "Audit",
            description: "Review current profiles, content performance, audience behavior, competitors, creative gaps, and conversion paths."
        },
        {
            title: "Plan",
            description: "Build platform strategy, content pillars, posting rhythm, campaign ideas, paid targeting, and reporting goals."
        },
        {
            title: "Create",
            description: "Produce posts, reels, carousels, captions, ad creatives, stories, and brand-safe trend concepts for each platform."
        },
        {
            title: "Optimize",
            description: "Use performance data to refine hooks, formats, posting times, audiences, budgets, and creative direction."
        }
    ],
    expectations: [
        "Content calendars are tied to business goals, not random posting.",
        "Creative performance is reviewed by format, hook, platform, and audience response.",
        "Paid social campaigns are tracked against leads, cost per result, and conversion quality.",
        "Reporting connects social engagement with website traffic, inquiries, and campaign learnings."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "social"
        ],
        title: "Social Media Results",
        linkLabel: "See all social work"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids social media marketing services?",
            answer: "Our social media marketing work can include strategy, content calendars, creative production, caption writing, community management, paid social campaigns, reporting, and performance optimization."
        },
        {
            question: "Which social media platforms do you manage?",
            answer: "We can support Instagram, Facebook, LinkedIn, X, Pinterest, YouTube, and other platforms when they match your audience, content format, and campaign goals."
        },
        {
            question: "Do you handle both organic social and paid social campaigns?",
            answer: "Yes. We can combine organic content, community engagement, paid social advertising, retargeting, and campaign reporting so social activity connects to measurable growth."
        },
        {
            question: "How do you measure social media marketing success?",
            answer: "We track metrics such as reach, engagement quality, follower growth, website clicks, leads, conversions, cost per result, creative performance, and audience insights."
        }
    ],
    relatedLinks: [
        {
            title: "PPC Advertising",
            href: "/services/ppc",
            description: "Scale demand with paid search and performance campaigns."
        },
        {
            title: "Influencer Marketing",
            href: "/services/influencer-marketing",
            description: "Add creator trust and social proof to campaign reach."
        },
        {
            title: "Video Production Ads",
            href: "/services/video-production-ad",
            description: "Create video assets built for social platforms and ads."
        },
        {
            title: "Web Development",
            href: "/services/web-development",
            description: "Send social traffic to fast, conversion-ready landing pages."
        }
    ],
    relatedArticles: [
        {
            title: "2026 Social Media Marketing Trends",
            href: "/blog/2026-social-media-marketing-trends-operationalizing-ai-and-creative",
            category: "Social Trends",
            description: "See how AI, creative systems, and sharper planning are changing social media execution."
        },
        {
            title: "How To Build A Storytelling Campaign Strategy",
            href: "/blog/how-to-build-a-storytelling-campaign-strategy-the-2026-model",
            category: "Campaign Strategy",
            description: "Build a storytelling campaign strategy with the 5 C's and the 3-3-3 rule to scale your brand narrative."
        },
        {
            title: "Scale Influencer Content With Paid Media",
            href: "/blog/how-to-scale-influencer-content-with-paid-media-playbook",
            category: "Paid Social",
            description: "Use creator licensing and whitelisting to scale influencer content with paid media across Meta and TikTok."
        }
    ],
    closing: {
        title: "Ready to build social momentum?",
        text: "Let's discuss how social strategy, creative content, and paid campaigns can turn your audience into measurable demand."
    },
    seo: {
        name: "Social Media Marketing Services",
        description: "Grow your brand with Digital Corvids social media marketing: content strategy, creative production, paid social campaigns, analytics, and platform management.",
        serviceType: "Social Media Marketing",
        breadcrumbName: "Social Media Marketing"
    }
};

export default page;
