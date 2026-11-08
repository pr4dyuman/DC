import {
    getBuiltInCaseStudies,
    type PortfolioCaseStudy,
    type PortfolioInsight,
    type PortfolioProof,
} from "@/lib/marketing-portfolio";
import { INSIGHT_TYPES } from "@/lib/marketing-portfolio-validation";

/**
 * Field definitions for the Super Admin case study editor. One generic form
 * draws every proof type and every insight type from these, so a new field is
 * one line here rather than a new form.
 */

type Base = { key: string; label: string; help?: string; optional?: boolean };

export type FieldSpec =
    | (Base & { kind: "text"; multiline?: boolean; placeholder?: string })
    | (Base & { kind: "number"; nullable?: string; /** Shown this much higher than stored, e.g. 1 for list positions counted from 0. */ offset?: number })
    | (Base & { kind: "select"; options: Array<{ value: string; label: string }> })
    | (Base & { kind: "boolean" })
    | (Base & { kind: "color" })
    | (Base & { kind: "image"; extra?: FieldSpec[] })
    | (Base & { kind: "images"; max?: number; extra?: FieldSpec[] })
    | (Base & { kind: "texts"; max?: number; placeholder?: string })
    | (Base & { kind: "csv"; numeric?: boolean })
    | (Base & { kind: "group"; fields: FieldSpec[] })
    | (Base & { kind: "list"; itemName: string; item: FieldSpec[]; newItem: () => Record<string, unknown>; max?: number });

const text = (key: string, label: string, extra: Partial<Base & { multiline: boolean; placeholder: string }> = {}): FieldSpec => ({
    kind: "text",
    key,
    label,
    ...extra,
});
const number = (key: string, label: string, extra: Partial<Base & { nullable: string; offset: number }> = {}): FieldSpec => ({
    kind: "number",
    key,
    label,
    ...extra,
});

const KPI_FIELDS: FieldSpec[] = [text("value", "Number", { placeholder: "+402%" }), text("label", "What it measures")];
const POINT_FIELDS: FieldSpec[] = [text("label", "Label", { placeholder: "Dec" }), number("value", "Value")];

function pointsList(key: string, label: string, help?: string): FieldSpec {
    return { kind: "list", key, label, help, itemName: "point", item: POINT_FIELDS, newItem: () => ({ label: "", value: 0 }) };
}

function kpiList(key: string, label: string, max: number, help?: string): FieldSpec {
    return { kind: "list", key, label, help, itemName: "number", item: KPI_FIELDS, newItem: () => ({ value: "", label: "" }), max };
}

export const IMAGE_HELP = "Upload an image or paste a link. Width and height fill in from the image.";

/** The fields every case study has, outside its proof and extra visuals. */
export const HEADLINE_FIELD: FieldSpec = {
    kind: "group",
    key: "headline",
    label: "Headline number",
    optional: true,
    help: "The one number that matters, shown large. Use digits with + − % × k M and put any currency in the label.",
    fields: [text("value", "Number", { placeholder: "+402%" }), text("label", "What it measures", { placeholder: "Organic clicks per month" })],
};

export const KPIS_FIELD: FieldSpec = kpiList("kpis", "Supporting numbers", 4, "Up to four. The first two also show on the service page.");

export const SCOPE_FIELD: FieldSpec = {
    kind: "texts",
    key: "scope",
    label: "What we did (tags)",
    optional: true,
    max: 8,
    placeholder: "Technical SEO",
};

export const STORY_FIELD: FieldSpec = {
    kind: "group",
    key: "story",
    label: "Story",
    optional: true,
    help: "Adding a story gives the case study its own page at /portfolio/<address>.",
    fields: [
        text("challenge", "The challenge", { multiline: true }),
        {
            kind: "list",
            key: "steps",
            label: "What we did, step by step",
            itemName: "step",
            item: [text("title", "Step"), text("when", "When", { optional: true, placeholder: "Mar 2026" }), text("text", "What happened", { multiline: true })],
            newItem: () => ({ title: "", when: "", text: "" }),
            max: 6,
        },
        text("result", "The result", { multiline: true }),
        text("source", "Where the numbers come from", { optional: true, placeholder: "Google Search Console, Jan–Dec 2026" }),
    ],
};

export const TESTIMONIAL_FIELD: FieldSpec = {
    kind: "group",
    key: "testimonial",
    label: "Client quote",
    optional: true,
    help: "Only with the client's permission, in their words.",
    fields: [text("quote", "Quote", { multiline: true }), text("name", "Name"), text("role", "Role and company")],
};

export const LIVE_FIELD: FieldSpec = {
    kind: "group",
    key: "live",
    label: "Live link",
    optional: true,
    help: "A link to the client's site or profile.",
    fields: [text("url", "Address", { placeholder: "https://example.com" }), text("label", "Link text", { placeholder: "Visit the site" })],
};

export const PROOF_LABELS: Record<PortfolioProof["type"], string> = {
    website: "Website or web app walkthrough",
    seo: "SEO results",
    social: "Social media profile and growth",
    ads: "Ad and before/after numbers",
    video: "Film, stills and channels",
    influencer: "Creators and their content",
    branding: "Before and after logos",
};

export const PROOF_FIELDS: Record<PortfolioProof["type"], FieldSpec[]> = {
    website: [
        text("projectType", "Project type", { placeholder: "E-commerce Website" }),
        text("status", "Status", { placeholder: "Live Website" }),
        text("urlLabel", "Address shown in the browser bar", { placeholder: "example.com" }),
        text("video", "Walkthrough video link (WebM or MP4)", { help: "A path like /portfolio/client.webm or an https:// link." }),
        { kind: "image", key: "poster", label: "Poster image (1280×800 or 1440×900)" },
    ],
    seo: [
        text("metric", "Chart title", { placeholder: "Organic clicks per month" }),
        pointsList("points", "Clicks each month", "Twelve months is ideal. From Search Console → Performance → Export."),
        number("startIndex", "Month the work began", { optional: true, offset: 1, help: "Its number in the list above: 1 is the first month." }),
        text("startLabel", "Label for that month", { optional: true, placeholder: "SEO work starts" }),
        {
            kind: "list",
            key: "keywords",
            label: "Keyword positions (shown on cards)",
            optional: true,
            itemName: "keyword",
            item: [text("term", "Search term"), number("before", "Position before", { nullable: "Not ranking before" }), number("after", "Position now")],
            newItem: () => ({ term: "", before: null, after: 1 }),
            max: 12,
        },
        {
            kind: "group",
            key: "serp",
            label: "Search result card",
            optional: true,
            fields: [text("siteName", "Site name"), text("url", "Address line"), text("title", "Title"), text("description", "Description", { multiline: true }), number("position", "Position")],
        },
        {
            kind: "group",
            key: "report",
            label: "Search Console report (case study page)",
            optional: true,
            help: "Four figures for the first and latest month, impressions for each month of clicks, and step markers.",
            fields: [
                text("title", "Report title", { placeholder: "Google Search Console · monthly" }),
                {
                    kind: "list",
                    key: "metrics",
                    label: "Figures",
                    itemName: "figure",
                    item: [text("label", "Label"), text("before", "First month"), text("after", "Latest month")],
                    newItem: () => ({ label: "", before: "", after: "" }),
                    max: 4,
                },
                pointsList("impressions", "Impressions each month", "One for each month of clicks, same labels."),
                {
                    kind: "list",
                    key: "markers",
                    label: "Step markers",
                    optional: true,
                    help: "Numbered dots on the chart for each step of the work. Month number 1 is the first month above.",
                    itemName: "marker",
                    item: [number("index", "Month number", { offset: 1 }), text("label", "Label", { placeholder: "01" })],
                    newItem: () => ({ index: 0, label: "" }),
                    max: 6,
                },
            ],
        },
    ],
    social: [
        text("platform", "Platform", { placeholder: "Instagram" }),
        text("handle", "Handle", { placeholder: "@brand" }),
        { kind: "image", key: "avatar", label: "Profile picture" },
        {
            kind: "group",
            key: "profile",
            label: "Profile header (large phone)",
            optional: true,
            fields: [text("name", "Name"), { kind: "texts", key: "bio", label: "Bio lines", max: 4 }, text("action", "Button", { optional: true, placeholder: "Book a table" })],
        },
        { kind: "images", key: "posts", label: "Posts (nine square images)", max: 9 },
        {
            kind: "list",
            key: "profileStats",
            label: "Profile numbers",
            itemName: "number",
            item: [text("label", "Label", { placeholder: "followers" }), text("value", "Value", { placeholder: "9,870" })],
            newItem: () => ({ label: "", value: "" }),
            max: 3,
        },
        {
            kind: "group",
            key: "growth",
            label: "Growth chart",
            fields: [text("label", "What grew", { placeholder: "Followers" }), pointsList("points", "Each month")],
        },
    ],
    ads: [
        text("platform", "Platform", { placeholder: "Google Ads" }),
        {
            kind: "group",
            key: "ad",
            label: "Best-performing ad",
            fields: [
                text("siteName", "Advertiser"),
                text("url", "Display address"),
                text("headline", "Headline"),
                text("description", "Description", { multiline: true }),
                { kind: "texts", key: "sitelinks", label: "Sitelinks", optional: true, max: 4 },
            ],
        },
        {
            kind: "list",
            key: "comparisons",
            label: "Before and after",
            itemName: "comparison",
            item: [
                text("label", "Measure", { placeholder: "Cost per lead" }),
                number("before", "Before"),
                number("after", "After"),
                {
                    kind: "select",
                    key: "format",
                    label: "Shown as",
                    options: [
                        { value: "number", label: "Number" },
                        { value: "inr", label: "Rupees (₹)" },
                        { value: "percent", label: "Percent (%)" },
                        { value: "multiplier", label: "Multiplier (×)" },
                    ],
                },
                { kind: "boolean", key: "lowerIsBetter", label: "Lower is better (costs)" },
            ],
            newItem: () => ({ label: "", before: 0, after: 0, format: "number" }),
            max: 4,
        },
    ],
    video: [
        text("title", "Film title", { placeholder: "Launch film" }),
        text("duration", "Length", { placeholder: "0:30" }),
        { kind: "image", key: "poster", label: "Poster (16:9)" },
        text("video", "Video file link", { optional: true, help: "Optional. Plays on hover and in the player." }),
        { kind: "images", key: "stills", label: "Stills (three, 16:9)", max: 6 },
        { kind: "texts", key: "channels", label: "Channels", max: 6, placeholder: "Instagram Reels" },
    ],
    influencer: [
        {
            kind: "list",
            key: "creators",
            label: "Creators",
            itemName: "creator",
            item: [text("name", "Name"), text("handle", "Handle"), text("followers", "Followers", { placeholder: "95k" }), text("initials", "Initials")],
            newItem: () => ({ name: "", handle: "", followers: "", initials: "" }),
            max: 12,
        },
        { kind: "images", key: "content", label: "Content (vertical 9:16 images)", max: 6, extra: [text("handle", "Creator handle")] },
    ],
    branding: [
        { kind: "image", key: "before", label: "Old logo", optional: true },
        { kind: "image", key: "after", label: "New logo" },
        {
            kind: "list",
            key: "palette",
            label: "Colours",
            itemName: "colour",
            item: [text("name", "Name"), { kind: "color", key: "hex", label: "Colour" }],
            newItem: () => ({ name: "", hex: "#000000" }),
            max: 8,
        },
        { kind: "images", key: "applications", label: "Applications (4:3)", max: 6 },
    ],
};

export const INSIGHT_LABELS: Record<PortfolioInsight["type"], { name: string; description: string }> = {
    "search-results": { name: "Search results page", description: "The client highlighted on a Google results page, in the map pack or as the top ad." },
    "rank-movement": { name: "Keyword movement", description: "Each keyword's position before and after, with page one shaded." },
    "score-rings": { name: "Page speed scores", description: "Lighthouse scores before and after." },
    "message-inbox": { name: "Message inbox", description: "Direct messages with reply times." },
    "post-stats": { name: "Best post or reel", description: "One standout post and its numbers." },
    bars: { name: "Bar chart", description: "Columns over time, or two or three bars to compare." },
    "weekly-combo": { name: "Bars and a line", description: "Two measures on separate axes, such as leads and cost per lead." },
    funnel: { name: "Funnel", description: "Each step from first view to result." },
    "landing-page": { name: "Landing page", description: "The page an ad leads to, on a phone." },
    retention: { name: "Video retention", description: "Share of viewers still watching at each second." },
    cuts: { name: "Video cuts", description: "One film's versions in their real shapes." },
    split: { name: "Split of a total", description: "A total broken into parts, such as views by channel." },
    "creator-leaderboard": { name: "Creator leaderboard", description: "Sign-ups by creator code." },
    "logo-versions": { name: "Logo versions", description: "Full, stacked and monogram logos in the brand colours." },
    "type-specimen": { name: "Typefaces", description: "The brand's fonts with samples." },
};

const COMMON_INSIGHT_FIELDS: FieldSpec[] = [
    text("title", "Title"),
    text("note", "Note under it", { optional: true, multiline: true }),
    { kind: "boolean", key: "wide", label: "Full width", help: "Otherwise it pairs with the next one." },
];

export const INSIGHT_FIELDS: Record<PortfolioInsight["type"], FieldSpec[]> = {
    "search-results": [
        text("query", "Search query"),
        number("position", "Organic position"),
        {
            kind: "group",
            key: "result",
            label: "The client's result",
            fields: [text("siteName", "Site name"), text("url", "Address line"), text("title", "Title"), text("description", "Description", { multiline: true })],
        },
        {
            kind: "group",
            key: "mapPack",
            label: "Map pack listing",
            optional: true,
            fields: [text("name", "Name"), number("rating", "Rating (0–5)"), number("reviews", "Reviews"), text("detail", "Detail line")],
        },
        {
            kind: "group",
            key: "ad",
            label: "Show as the top ad instead",
            optional: true,
            fields: [{ kind: "texts", key: "sitelinks", label: "Sitelinks", max: 4 }, text("call", "Call button", { optional: true })],
        },
    ],
    "rank-movement": [
        {
            kind: "list",
            key: "keywords",
            label: "Keywords",
            itemName: "keyword",
            item: [
                text("term", "Search term"),
                number("before", "Position before", { nullable: "Not ranking before" }),
                number("after", "Position now"),
                text("volume", "Searches a month", { optional: true, placeholder: "1.9k" }),
            ],
            newItem: () => ({ term: "", before: null, after: 1, volume: "" }),
            max: 10,
        },
    ],
    "score-rings": [
        {
            kind: "list",
            key: "scores",
            label: "Scores",
            itemName: "score",
            item: [text("label", "Label", { placeholder: "Performance" }), number("before", "Before"), number("after", "After")],
            newItem: () => ({ label: "", before: 0, after: 0 }),
            max: 4,
        },
    ],
    "message-inbox": [
        {
            kind: "list",
            key: "messages",
            label: "Messages",
            itemName: "message",
            item: [text("from", "From (first name)"), text("text", "Message"), text("time", "Time"), text("reply", "Reply note", { placeholder: "Replied in 4 min" })],
            newItem: () => ({ from: "", text: "", time: "", reply: "" }),
            max: 6,
        },
        kpiList("summary", "Two totals under it", 2),
    ],
    "post-stats": [
        { kind: "image", key: "image", label: "Cover image" },
        text("caption", "Caption"),
        { kind: "group", key: "headline", label: "Main number", fields: KPI_FIELDS },
        kpiList("stats", "Other numbers (likes, comments, shares, saves)", 4),
    ],
    bars: [
        pointsList("bars", "Bars"),
        text("prefix", "Before each number", { optional: true, placeholder: "₹" }),
        text("suffix", "After each number", { optional: true, placeholder: "%" }),
    ],
    "weekly-combo": [
        { kind: "csv", key: "labels", label: "Labels, comma separated", help: "A month name where each month starts, blank otherwise: Jun,,,,Jul,,," },
        {
            kind: "group",
            key: "bars",
            label: "Bars",
            fields: [text("label", "Measure"), { kind: "csv", key: "values", label: "Values, comma separated", numeric: true }],
        },
        {
            kind: "group",
            key: "line",
            label: "Line",
            fields: [text("label", "Measure"), { kind: "csv", key: "values", label: "Values, comma separated", numeric: true }, text("prefix", "Before each number", { optional: true })],
        },
    ],
    funnel: [
        {
            kind: "list",
            key: "stages",
            label: "Stages, largest first",
            itemName: "stage",
            item: [text("label", "Stage"), number("value", "Count")],
            newItem: () => ({ label: "", value: 0 }),
            max: 6,
        },
    ],
    "landing-page": [
        text("url", "Address"),
        text("eyebrow", "Small heading"),
        text("heading", "Heading"),
        text("price", "Price line"),
        { kind: "texts", key: "points", label: "Points", max: 5 },
        { kind: "texts", key: "fields", label: "Form fields", max: 5 },
        text("cta", "Button"),
    ],
    retention: [
        {
            kind: "list",
            key: "points",
            label: "Points (start with second 0 at 100%)",
            itemName: "point",
            item: [number("second", "Second"), number("percent", "Still watching (%)")],
            newItem: () => ({ second: 0, percent: 100 }),
            max: 40,
        },
        { kind: "group", key: "hook", label: "Opening hook", fields: [number("until", "Ends at second"), text("label", "Label")] },
    ],
    cuts: [
        {
            kind: "list",
            key: "versions",
            label: "Versions",
            itemName: "version",
            item: [
                text("label", "Length", { placeholder: "30 seconds" }),
                {
                    kind: "select",
                    key: "ratio",
                    label: "Shape",
                    options: [
                        { value: "16:9", label: "16:9 wide" },
                        { value: "9:16", label: "9:16 vertical" },
                        { value: "1:1", label: "1:1 square" },
                    ],
                },
                { kind: "image", key: "image", label: "Frame" },
                text("use", "Where it ran"),
            ],
            newItem: () => ({ label: "", ratio: "16:9", image: { src: "", width: 1280, height: 720, alt: "" }, use: "" }),
            max: 4,
        },
    ],
    split: [text("total", "Total as shown", { placeholder: "1.2M" }), pointsList("parts", "Parts (must add up to the total)")],
    "creator-leaderboard": [
        {
            kind: "list",
            key: "creators",
            label: "Creators",
            itemName: "creator",
            item: [text("handle", "Handle"), text("initials", "Initials"), number("followers", "Followers"), text("code", "Discount code"), number("signups", "Sign-ups")],
            newItem: () => ({ handle: "", initials: "", followers: 1000, code: "", signups: 0 }),
            max: 12,
        },
    ],
    "logo-versions": [
        text("name", "Brand name"),
        text("monogram", "Monogram letters"),
        text("tagline", "Tagline"),
        {
            kind: "group",
            key: "colors",
            label: "Colours",
            fields: [
                { kind: "color", key: "dark", label: "Dark" },
                { kind: "color", key: "mid", label: "Mid" },
                { kind: "color", key: "accent", label: "Accent" },
                { kind: "color", key: "light", label: "Light" },
            ],
        },
    ],
    "type-specimen": [
        {
            kind: "list",
            key: "faces",
            label: "Typefaces",
            itemName: "typeface",
            item: [
                text("name", "Name"),
                text("role", "Used for"),
                {
                    kind: "select",
                    key: "family",
                    label: "Shown in",
                    options: [
                        { value: "display", label: "Display face" },
                        { value: "text", label: "Text face" },
                    ],
                },
                text("sample", "Sample text", { multiline: true }),
            ],
            newItem: () => ({ name: "", role: "", family: "text", sample: "" }),
            max: 3,
        },
    ],
};

export function getInsightFields(type: PortfolioInsight["type"]): FieldSpec[] {
    return [...COMMON_INSIGHT_FIELDS, ...(INSIGHT_FIELDS[type] || [])];
}

export const ADDABLE_INSIGHT_TYPES = [...INSIGHT_TYPES];

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/** A proof of a type, copied from a built-in case study, for when the main service changes. */
export function createProof(type: PortfolioProof["type"]): PortfolioProof {
    const found = getBuiltInCaseStudies().find((study) => study.proof.type === type);
    return found ? clone(found.proof) : ({ type } as PortfolioProof);
}

/**
 * Tidies a case study from the editor before it is checked and saved: drops
 * empty text and anything left undefined, so optional fields that were
 * cleared disappear. Lists keep their entries as they are (chart labels can be
 * blank on purpose).
 */
export function tidyCaseStudy<T>(value: T): T {
    if (Array.isArray(value)) return value.map((item) => tidyCaseStudy(item)) as T;
    if (value && typeof value === "object") {
        const tidy: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            if (item === undefined || item === "") continue;
            tidy[key] = tidyCaseStudy(item);
        }
        return tidy as T;
    }
    return value;
}

/** A new insight of a type, prefilled from a sample so the shape is clear. */
export function createInsight(type: PortfolioInsight["type"]): PortfolioInsight {
    for (const study of getBuiltInCaseStudies()) {
        const found = study.insights?.find((insight) => insight.type === type);
        if (found) return clone(found);
    }
    return { type, title: INSIGHT_LABELS[type]?.name || "New visual" } as PortfolioInsight;
}

/**
 * A new draft case study for a main service, copied from the built-in sample
 * (or real project) for that service. Its numbers and images are placeholders
 * to replace; sample images block publishing until they are.
 */
export function createDraftCaseStudy(mainService: PortfolioCaseStudy["services"][number]): PortfolioCaseStudy {
    const source =
        getBuiltInCaseStudies().find((study) => study.status === "sample" && study.services[0] === mainService) ||
        getBuiltInCaseStudies().find((study) => study.services[0] === mainService) ||
        getBuiltInCaseStudies()[0];
    const draft = clone(source);
    return {
        ...draft,
        slug: `new-${mainService}-${Date.now().toString(36)}`,
        status: "draft",
        client: "New client",
        services: [mainService, ...draft.services.filter((id) => id !== mainService)],
        featured: false,
        testimonial: undefined,
    };
}
