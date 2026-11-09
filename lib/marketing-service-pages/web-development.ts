import type { ServicePageData } from "./index";

// Content for /services/web-development. See ./index.ts for how the page uses it.
const page: ServicePageData = {
    slug: "web-development",
    path: "/services/web-development",
    title: "Web Development",
    eyebrow: "Building digital experiences",
    summary: "We design and build fast, mobile-friendly websites and web apps that explain what you do and turn visitors into enquiries. Every site is search-friendly from day one and easy for your team to update.",
    cardText: "Your website is your digital storefront. We build fast, secure, and user-friendly sites optimized for conversions.",
    highlights: [
        "Mobile-first, fast websites",
        "SEO-ready from day one",
        "Easy for your team to update",
        "Accessible (WCAG) design"
    ],
    image: {
        src: "/web3.svg",
        alt: "Web Development illustration"
    },
    ctaLabel: "Get a free website plan",
    resultsLabel: "See websites we built",
    audience: [
        {
            title: "New businesses",
            text: "A professional website that explains what you do and turns visitors into enquiries from day one."
        },
        {
            title: "Outdated websites",
            text: "Slow, hard-to-update or not mobile-friendly sites that need a rebuild."
        },
        {
            title: "Online stores and web apps",
            text: "Ecommerce sites and custom web applications built around how your team works."
        }
    ],
    deliverables: [
        {
            title: "UX design & research",
            text: "Research and wireframes so visitors find what they need fast.",
            icon: "layout",
            items: [
                "User Research & Needs Development",
                "Information Architecture",
                "Interactive Wireframes",
                "Usability Testing",
                "Accessibility Compliance (WCAG)"
            ]
        },
        {
            title: "Responsive development",
            text: "Pixel-perfect sites and apps that work on every device.",
            icon: "smartphone",
            items: [
                "Custom Frontend Development (HTML, CSS3, JavaScript)",
                "Cross-Platform App Development",
                "Design Systems & Design Consistency",
                "CMS Integration (WordPress, Shopify, etc.)",
                "Ecommerce Solutions"
            ]
        },
        {
            title: "Technical SEO",
            text: "Search-friendly from the ground up, not fixed after launch.",
            icon: "search",
            items: [
                "Core Web Vitals Optimization",
                "Schema Markup Implementation",
                "Website Architecture",
                "Mobile & Desktop Performance",
                "Indexing & Crawlability",
                "Page Speed Enhancements"
            ]
        },
        {
            title: "Performance",
            text: "Fast pages through lean code, compressed images and caching.",
            icon: "gauge",
            items: [
                "Code Optimization & Minification",
                "Image Compression & Lazy Loading",
                "Caching Strategy Implementation",
                "CDN Integration & Setup",
                "Database Query Optimization"
            ]
        }
    ],
    process: [
        {
            title: "Discovery",
            description: "Clarify business goals, user journeys, page priorities, technical constraints, integrations, and launch requirements."
        },
        {
            title: "Structure",
            description: "Plan information architecture, responsive layouts, content hierarchy, conversion paths, and SEO-friendly page structure."
        },
        {
            title: "Build",
            description: "Develop clean, scalable frontend and backend pieces with CMS, ecommerce, analytics, and performance requirements in mind."
        },
        {
            title: "Launch",
            description: "Test across devices, check speed and crawlability, connect forms and tracking, then monitor improvements after release."
        }
    ],
    expectations: [
        "Responsive layouts are checked across mobile, tablet, and desktop breakpoints.",
        "Performance work covers image sizing, lazy loading, caching, and Core Web Vitals basics.",
        "Technical SEO foundations are planned before launch, not added as an afterthought.",
        "CMS, ecommerce, and integrations are selected around the team's real workflow."
    ],
    pricing: {
        from: null
    },
    caseStudies: {
        services: [
            "web",
            "app"
        ],
        title: "Websites And Web Apps",
        linkLabel: "See all web projects"
    },
    faqs: [
        {
            question: "What is included in Digital Corvids web development services?",
            answer: "Our web development work can include UX planning, responsive frontend development, CMS or ecommerce integration, technical SEO foundations, performance optimization, QA, and launch support."
        },
        {
            question: "Do you build custom websites or use templates?",
            answer: "We build around the business need. For most growth-focused projects, we create custom layouts and components, then connect them to the right CMS, ecommerce platform, or backend workflow."
        },
        {
            question: "Will the website be mobile-friendly and SEO-ready?",
            answer: "Yes. We plan responsive layouts, crawlable pages, clean headings, optimized images, schema-ready structure, and Core Web Vitals improvements from the start."
        },
        {
            question: "Can you improve an existing website instead of rebuilding it?",
            answer: "Yes. We can audit an existing site for speed, UX, technical SEO, content structure, conversion paths, and code quality before deciding whether optimization or rebuilding is the better route."
        }
    ],
    relatedLinks: [
        {
            title: "SEO Services",
            href: "/services/seo",
            description: "Make the new website easier to crawl, index, and rank."
        },
        {
            title: "PPC Advertising",
            href: "/services/ppc",
            description: "Send qualified traffic to high-converting landing pages."
        },
        {
            title: "Social Media Marketing",
            href: "/services/social-media-marketing",
            description: "Support launch campaigns with consistent social visibility."
        },
        {
            title: "Website Templates",
            href: "/templates",
            description: "Smaller budget? Start from a ready-made website and let us customise it."
        }
    ],
    relatedArticles: [
        {
            title: "Custom Web App Architecture For Growing Businesses",
            href: "/blog/customized-web-application-development-architecture",
            category: "Web Architecture",
            description: "See how custom web application architecture replaces rigid templates and balances scalability with maintainability."
        },
        {
            title: "Technical SEO Vs On-Page SEO Priorities",
            href: "/blog/technical-seo-vs-on-page-key-implementation-priorities",
            category: "Technical SEO",
            description: "Learn where the core boundaries sit between technical SEO work and on-page SEO work."
        },
        {
            title: "Conversion Funnel Mapping And Optimization",
            href: "/blog/conversion-funnel-mapping-and-optimization-to-stop-leaks",
            category: "Conversion Paths",
            description: "Map your conversion funnel, track leaks in GA4, analyze behavior, and optimize touchpoints for conversions."
        }
    ],
    closing: {
        title: "Ready to transform your digital presence?",
        text: "Let’s discuss how our web development expertise can help you achieve your business goals with a website that stands out from the competition."
    },
    seo: {
        name: "Web Development Services",
        description: "Build fast, secure, conversion-focused websites with Digital Corvids web development, UX design, responsive development, technical SEO, and performance optimization.",
        serviceType: "Web Development",
        breadcrumbName: "Web Development"
    }
};

export default page;
