import type { ServicePageData } from "./index";

// Content for /services/seo. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "seo",
    path: "/services/seo",
    title: "Search Engine Optimization",
    titleParts: ["Search Engine", "Optimization"],
    eyebrow: "Rank higher, grow faster",
    summary: "We help your business show up when customers search on Google. We fix the technical basics, write pages around what people really search for, strengthen your local listing and build your site's authority, then report traffic, rankings and enquiries every month.",
    cardText: "SEO is the backbone of organic growth. We optimize your website to rank higher on Google, drive targeted traffic, and turn visitors into loyal customers.",
    highlights: [
        "Technical, content and local SEO",
        "Keywords tied to search intent",
        "Monthly ranking and lead reports",
        "White-hat methods only"
    ],
    image: {
        src: "/web4.svg",
        alt: "Search Engine Optimization illustration"
    },
    ctaLabel: "Get a free SEO plan",
    resultsLabel: "See SEO results",
    audience: [
        {
            title: "Local businesses",
            text: "Clinics, shops, restaurants and service firms that want more calls and visits from people searching nearby."
        },
        {
            title: "Growing companies",
            text: "Businesses that want a steady flow of enquiries from Google without paying for every click."
        },
        {
            title: "Websites losing traffic",
            text: "Sites with slow pages, indexing problems or rankings that dropped after a redesign."
        }
    ],
    deliverables: [
        {
            title: "Technical SEO",
            heading: ["Technical SEO", "Optimization"],
            image: "/seo2.svg",
            text: "Make sure Google can crawl, load and understand every page.",
            items: [
                "Website Speed & Core Web Vitals",
                "Mobile-First Indexing Optimization",
                "Schema Markup Implementation",
                "XML Sitemaps & Robots.txt",
                "SSL Security & HTTPS Migration"
            ]
        },
        {
            title: "Keyword research & content",
            heading: ["Keyword Research", "& Content Optimization"],
            image: "/seo3.svg",
            text: "Target the searches your customers actually make.",
            items: [
                "Comprehensive keyword research & competitor analysis",
                "Content strategy development & optimization",
                "On-page SEO optimization",
                "Content clusters and topic authority",
                "Long-tail keyword targeting & strategy"
            ]
        },
        {
            title: "Local SEO & Google Business Profile",
            heading: ["Local SEO", "& Google Business Profile"],
            image: "/seo4.svg",
            text: "Be the first choice when people nearby search for what you offer.",
            items: [
                "Google Business Profile setup and optimization",
                "Local keyword and “near me” search targeting",
                "Location and service-area landing pages",
                "Local citations with a consistent name, address and phone number",
                "Local content that answers what nearby customers search for"
            ]
        },
        {
            title: "Link building & authority",
            heading: ["Link Building", "& Authority"],
            image: "/seo5.svg",
            text: "Build your site's authority so its rankings last.",
            items: [
                "High-Quality Backlink Acquisition",
                "Guest Posting & Content Outreach",
                "Broken Link Building Strategies",
                "Competitor Backlink Analysis",
                "Domain Authority Improvement"
            ]
        }
    ],
    process: [
        {
            title: "Audit",
            description: "Review crawlability, indexability, page speed, metadata, internal links, duplicate content, and priority ranking opportunities."
        },
        {
            title: "Strategy",
            description: "Map keywords to service pages, define content clusters, prioritize quick technical wins, and set reporting goals."
        },
        {
            title: "Implementation",
            description: "Improve on-page content, schema, headings, links, images, Core Web Vitals, and search-friendly page structure."
        },
        {
            title: "Reporting",
            description: "Track visibility, traffic, rankings, conversion paths, and next actions so SEO stays tied to business outcomes."
        }
    ],
    expectations: [
        "Technical fixes are documented before and after implementation.",
        "Keyword and content recommendations are tied to search intent.",
        "Monthly reports focus on traffic quality, leads, and ranking movement.",
        "Internal links connect service pages, blog posts, and conversion pages."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "seo"
        ],
        title: "SEO Results",
        linkLabel: "See all SEO work"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids SEO services?",
            answer: "Our SEO work includes technical audits, keyword research, on-page optimization, content planning, internal linking, local SEO improvements, structured data guidance, and monthly reporting."
        },
        {
            question: "How long does SEO take to show results?",
            answer: "SEO is a compounding channel. Technical fixes can help quickly, but meaningful organic growth usually needs consistent optimization, content, and measurement over several months."
        },
        {
            question: "Do you handle technical SEO and content SEO together?",
            answer: "Yes. We connect crawlability, speed, schema, and site structure with keyword strategy, landing page content, blog planning, and internal links."
        },
        {
            question: "Can SEO help a Jaipur or India-focused business?",
            answer: "Yes. We can support local search visibility with location-aware landing pages, Google Business Profile alignment, service-page optimization, and relevant local content."
        }
    ],
    relatedLinks: [
        {
            title: "Web Development",
            href: "/services/web-development",
            description: "Build fast, crawlable, conversion-ready websites."
        },
        {
            title: "PPC Advertising",
            href: "/services/ppc",
            description: "Pair organic growth with immediate paid search demand."
        },
        {
            title: "zSEO.ai",
            href: "https://zseo.ai",
            description: "Plan SEO work and review every article before it publishes."
        },
        {
            title: "Digital Marketing Blog",
            href: "/blog",
            description: "Read current strategy guides and search marketing insights."
        }
    ],
    relatedArticles: [
        {
            title: "Technical SEO Vs On-Page SEO Priorities",
            href: "/blog/technical-seo-vs-on-page-key-implementation-priorities",
            category: "Technical SEO",
            description: "Learn where the core boundaries sit between technical SEO work and on-page SEO work."
        },
        {
            title: "Is AI-Generated Content Good For SEO?",
            href: "/blog/is-ai-generated-content-good-for-seo-the-strategic-playbook",
            category: "Content Quality",
            description: "Understand how AI content affects SEO, the E-E-A-T risks to watch, and how to build a human-led workflow."
        },
        {
            title: "Competitor Keyword Analysis Framework",
            href: "/blog/competitor-keyword-analysis-framework-map-gaps-win-traffic",
            category: "Keyword Strategy",
            description: "Use a competitor keyword analysis framework to find organic search gaps and target high-intent rankings."
        }
    ],
    closing: {
        title: "Ready to dominate",
        accent: "Google search results?",
        text: "Let's discuss how our proven SEO strategies can help you outrank competitors and drive qualified organic traffic."
    },
    seo: {
        name: "SEO Services in Jaipur",
        description: "Improve organic visibility with Digital Corvids SEO services: technical SEO, keyword strategy, content planning, on-page optimization, local SEO, and transparent reporting.",
        serviceType: "Search Engine Optimization",
        breadcrumbName: "SEO Services"
    }
};

export default page;
