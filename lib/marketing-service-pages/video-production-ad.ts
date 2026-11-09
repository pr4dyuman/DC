import type { ServicePageData } from "./index";

// Content for /services/video-production-ad. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "video-production-ad",
    path: "/services/video-production-ad",
    title: "Video Production & Ad Films in Jaipur",
    titleParts: ["Video Production & Ad Films", "in Jaipur"],
    cardTitle: ["Video Production", "& Ad Films"],
    titleSize: "md",
    eyebrow: "Story-led content",
    summary: "From the first idea to the final edit, we produce ad films, reels, explainers and brand videos, and cut each one for the platform where your audience will watch it.",
    cardText: "We craft high-quality, compelling videos that tell your brand's story, drive engagement, and convert viewers into customers.",
    highlights: [
        "Concept to final edit",
        "Ad films, reels and explainers",
        "Cut for each platform",
        "Performance tracked after launch"
    ],
    image: {
        src: "/vpd1.svg",
        alt: "Video Production & Ad Films illustration"
    },
    ctaLabel: "Get a free video plan",
    resultsLabel: "See video work",
    audience: [
        {
            title: "Brands launching something",
            text: "Product launches, openings and campaigns that need a strong ad film or reel."
        },
        {
            title: "Businesses on social media",
            text: "Regular reels and short videos made for Instagram, YouTube and LinkedIn."
        },
        {
            title: "Companies telling their story",
            text: "Brand films, testimonials and explainers for your website and sales team."
        }
    ],
    deliverables: [
        {
            title: "Pre-production",
            heading: ["Pre-Production", "& Planning"],
            image: "/vpd2.svg",
            text: "Concept, script and schedule agreed before the cameras roll.",
            items: [
                "Concept Development & Creative Briefs",
                "Scriptwriting & Storyboarding",
                "Location Scouting & Casting",
                "Shot Lists & Production Schedules",
                "Budget Planning & Resource Allocation"
            ]
        },
        {
            title: "Production",
            heading: ["High-Impact", "Production"],
            image: "/vpd3.svg",
            text: "A crew, lighting and sound to capture your story properly.",
            items: [
                "Multi-Camera Shoots & Cinematography",
                "Professional Lighting & Sound Design",
                "Drone & Aerial Videography",
                "On-Set Direction & Talent Management",
                "Live Event Coverage"
            ]
        },
        {
            title: "Post-production & editing",
            heading: ["Post-Production", "& Editing"],
            image: "/vpd4.svg",
            text: "Editing, colour, sound and motion graphics that finish the story.",
            items: [
                "Video Editing & Story Assembly",
                "Color Grading & Cinematic Enhancement",
                "Motion Graphics & Animation",
                "Sound Design & Audio Mixing",
                "VFX & Special Effects Integration"
            ]
        },
        {
            title: "Ad films & commercials",
            heading: ["Ad Films", "& Commercials"],
            image: "/vpd5.svg",
            text: "Ads people remember, from TV spots to social campaigns.",
            items: [
                "TV Commercials & Broadcast Ads",
                "Social Media Video Campaigns",
                "Product Demos & Explainer Videos",
                "Testimonials & Brand Storytelling",
                "Influencer & Partnership Content"
            ]
        },
        {
            title: "Distribution",
            heading: ["Distribution", "Strategy"],
            image: "/vpd6.svg",
            text: "Each video cut and placed for the platforms where your audience watches.",
            items: [
                "Platform-Specific Optimization (YouTube, Instagram, LinkedIn)",
                "Paid Media Campaigns & Targeting",
                "SEO & Video Marketing Strategy",
                "Analytics & Performance Tracking",
                "Cross-Channel Content Repurposing"
            ]
        }
    ],
    process: [
        {
            title: "Concept",
            description: "Define the message, audience, format, channel, creative angle, and campaign goal before production begins."
        },
        {
            title: "Plan",
            description: "Prepare scripts, storyboards, shot lists, schedules, locations, talent needs, production assets, and approvals."
        },
        {
            title: "Produce",
            description: "Capture footage, audio, product shots, interviews, b-roll, and platform-specific creative with a clear shot plan."
        },
        {
            title: "Polish",
            description: "Edit, color grade, mix sound, add motion graphics, export versions, and prepare launch-ready video assets."
        }
    ],
    expectations: [
        "Creative briefs connect every video to a campaign goal and audience insight.",
        "Production plans define formats, deliverables, timelines, and approval checkpoints early.",
        "Post-production includes edits built for platform behavior, not one generic video file.",
        "Distribution recommendations help each asset work across organic, paid, and landing page channels."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "video"
        ],
        title: "Video Work",
        linkLabel: "See all video work"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids video production services?",
            answer: "Our video production work can include concept development, scripting, storyboarding, production planning, shooting, editing, motion graphics, sound design, distribution planning, and performance reporting."
        },
        {
            question: "Do you create videos for ads and social media platforms?",
            answer: "Yes. We can create ad films, reels, product demos, explainer videos, testimonials, YouTube videos, and platform-specific cuts for Instagram, LinkedIn, Facebook, and paid campaigns."
        },
        {
            question: "Can you handle the full video process from idea to final delivery?",
            answer: "Yes. We can manage the complete workflow from creative brief and pre-production to filming, post-production, revisions, export formats, and launch recommendations."
        },
        {
            question: "How do you measure video production success?",
            answer: "We connect creative decisions to goals such as watch time, engagement, click-through rate, conversions, social shares, audience retention, and campaign performance."
        },
        {
            question: "How much does an ad film or video cost?",
            answer: "It depends on the concept, the number of shoot days, locations, cast and the edits you need. We price each plan after a free consultation, and you see the full plan and price before you commit to anything."
        },
        {
            question: "What kinds of videos do you make?",
            answer: "Ad films and TV commercials, social media video campaigns and reels, product demos and explainers, testimonials and brand stories, and influencer content."
        },
        {
            question: "Can you help our videos reach more people?",
            answer: "Yes. Distribution is part of the service: we cut each video for the platforms where your audience watches, such as YouTube, Instagram and LinkedIn, and can promote it with paid campaigns."
        }
    ],
    relatedLinks: [
        {
            title: "Social Media Marketing",
            href: "/services/social-media-marketing",
            description: "Use video assets across organic social and community campaigns."
        },
        {
            title: "PPC Advertising",
            href: "/services/ppc",
            description: "Turn video creative into paid campaigns with measurable results."
        },
        {
            title: "Influencer Marketing",
            href: "/services/influencer-marketing",
            description: "Combine creator content with brand-led production for trust and reach."
        },
        {
            title: "Web Development",
            href: "/services/web-development",
            description: "Place videos on fast landing pages that support conversion."
        }
    ],
    relatedArticles: [
        {
            title: "How To Measure Video Production Success",
            href: "/blog/how-to-measure-video-production-success-the-performance-framework",
            category: "Video Performance",
            description: "Measure video production success with behavioral metrics, performance pillars, and business ROI, not vanity views."
        },
        {
            title: "How To Build A Storytelling Campaign Strategy",
            href: "/blog/how-to-build-a-storytelling-campaign-strategy-the-2026-model",
            category: "Campaign Strategy",
            description: "Use a 2026 production guide to plan a storytelling campaign strategy and scale your brand narrative."
        },
        {
            title: "What PPC Services Include: The Video Edge",
            href: "/blog/what-is-included-in-ppc-advertising-services-the-video-edge",
            category: "Video Ads",
            description: "See how video-integrated deliverables and platform management fit into PPC advertising services."
        }
    ],
    closing: {
        title: "Ready to create",
        accent: "video that performs?",
        text: "Let's discuss how video strategy, production, editing, and distribution can turn your story into campaign-ready assets."
    },
    seo: {
        name: "Video Production and Ad Films",
        description: "Create high-impact videos and ad films with Digital Corvids, from pre-production and scripting to production, post-production, distribution, and performance creative.",
        serviceType: "Video Production",
        breadcrumbName: "Video Production and Ad Films"
    }
};

export default page;
