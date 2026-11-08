import {
    PORTFOLIO_SERVICES,
    PROOF_TYPE_FOR_SERVICE,
    type PortfolioCaseStudy,
    type PortfolioServiceId,
} from "@/lib/marketing-portfolio";

/**
 * Checks a case study before it is saved from Super Admin or drawn on the
 * site, so a typo can never break a page. The same rules run in the tests
 * against the built-in case studies.
 */

export const CASE_STUDY_STATUSES = ["draft", "sample", "published"] as const;
export type CaseStudyStatus = (typeof CASE_STUDY_STATUSES)[number];

export const INSIGHT_TYPES = [
    "search-results",
    "rank-movement",
    "score-rings",
    "message-inbox",
    "post-stats",
    "bars",
    "weekly-combo",
    "funnel",
    "landing-page",
    "retention",
    "cuts",
    "split",
    "creator-leaderboard",
    "logo-versions",
    "type-specimen",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const SAMPLE_IMAGE_PREFIX = "/portfolio/samples/";
const SERVICE_IDS = new Set<string>(PORTFOLIO_SERVICES.map((service) => service.id));
const TOP_LEVEL_KEYS = [
    "slug",
    "status",
    "client",
    "industry",
    "location",
    "services",
    "period",
    "featured",
    "headline",
    "summary",
    "kpis",
    "scope",
    "proof",
    "live",
    "story",
    "testimonial",
    "insights",
] as const;

type Record_ = Record<string, unknown>;

export type CaseStudyValidation =
    | { ok: true; value: PortfolioCaseStudy }
    | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record_ {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

class Checker {
    errors: string[] = [];

    fail(path: string, message: string) {
        this.errors.push(`${path}: ${message}`);
    }

    text(path: string, value: unknown, { required = true, max = 400 } = {}) {
        if (value === undefined || value === null || value === "") {
            if (required) this.fail(path, "is required");
            return;
        }
        if (typeof value !== "string") {
            this.fail(path, "must be text");
            return;
        }
        if (required && !value.trim()) this.fail(path, "is required");
        if (value.length > max) this.fail(path, `must be ${max} characters or fewer`);
    }

    number(path: string, value: unknown, { min = -Infinity, max = Infinity, integer = false } = {}) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            this.fail(path, "must be a number");
            return;
        }
        if (value < min || value > max) this.fail(path, `must be between ${min} and ${max}`);
        if (integer && !Number.isInteger(value)) this.fail(path, "must be a whole number");
    }

    list(path: string, value: unknown, { min = 0, max = 60 } = {}): unknown[] {
        if (!Array.isArray(value)) {
            this.fail(path, "must be a list");
            return [];
        }
        if (value.length < min) this.fail(path, `needs at least ${min}`);
        if (value.length > max) this.fail(path, `can have at most ${max}`);
        return value;
    }

    record(path: string, value: unknown): Record_ {
        if (!isRecord(value)) {
            this.fail(path, "is missing");
            return {};
        }
        return value;
    }

    link(path: string, value: unknown, { required = true } = {}) {
        this.text(path, value, { required, max: 600 });
        if (typeof value === "string" && value) {
            const ok = value.startsWith("/") || /^https:\/\/[^\s]+$/.test(value);
            if (!ok) this.fail(path, "must start with / or https://");
        }
    }

    image(path: string, value: unknown) {
        const image = this.record(path, value);
        this.link(`${path}.src`, image.src);
        this.number(`${path}.width`, image.width, { min: 1, max: 20000 });
        this.number(`${path}.height`, image.height, { min: 1, max: 40000 });
        this.text(`${path}.alt`, image.alt, { max: 300 });
    }

    kpi(path: string, value: unknown) {
        const kpi = this.record(path, value);
        this.text(`${path}.value`, kpi.value, { max: 24 });
        this.text(`${path}.label`, kpi.label, { max: 120 });
    }

    series(path: string, value: unknown, { min = 2 } = {}) {
        this.list(path, value, { min, max: 60 }).forEach((point, index) => {
            const item = this.record(`${path}[${index}]`, point);
            this.text(`${path}[${index}].label`, item.label, { max: 24 });
            this.number(`${path}[${index}].value`, item.value, { min: 0 });
        });
    }
}

function checkProof(check: Checker, proof: Record_, mainService: PortfolioServiceId | undefined) {
    const type = proof.type;
    const expected = mainService ? PROOF_TYPE_FOR_SERVICE[mainService] : undefined;
    if (expected && type !== expected) {
        check.fail("proof.type", `must be "${expected}" for the main service`);
        return;
    }

    switch (type) {
        case "website":
            check.text("proof.projectType", proof.projectType, { max: 60 });
            check.text("proof.status", proof.status, { max: 40 });
            check.text("proof.urlLabel", proof.urlLabel, { max: 120 });
            check.link("proof.video", proof.video);
            check.image("proof.poster", proof.poster);
            break;
        case "seo": {
            check.text("proof.metric", proof.metric, { max: 80 });
            check.series("proof.points", proof.points);
            const points = Array.isArray(proof.points) ? proof.points : [];
            if (proof.startIndex !== undefined) {
                check.number("proof.startIndex", proof.startIndex, { min: 0, max: Math.max(points.length - 1, 0), integer: true });
            }
            check.text("proof.startLabel", proof.startLabel, { required: false, max: 40 });
            if (proof.keywords !== undefined) {
                check.list("proof.keywords", proof.keywords, { max: 12 }).forEach((entry, index) => {
                    const keyword = check.record(`proof.keywords[${index}]`, entry);
                    check.text(`proof.keywords[${index}].term`, keyword.term, { max: 80 });
                    if (keyword.before !== null) check.number(`proof.keywords[${index}].before`, keyword.before, { min: 1 });
                    check.number(`proof.keywords[${index}].after`, keyword.after, { min: 1 });
                });
            }
            if (proof.serp !== undefined) {
                const serp = check.record("proof.serp", proof.serp);
                check.text("proof.serp.siteName", serp.siteName, { max: 80 });
                check.text("proof.serp.url", serp.url, { max: 120 });
                check.text("proof.serp.title", serp.title, { max: 120 });
                check.text("proof.serp.description", serp.description, { max: 300 });
                check.number("proof.serp.position", serp.position, { min: 1, max: 100, integer: true });
            }
            if (proof.report !== undefined) {
                const report = check.record("proof.report", proof.report);
                check.text("proof.report.title", report.title, { max: 80 });
                check.list("proof.report.metrics", report.metrics, { min: 1, max: 4 }).forEach((entry, index) => {
                    const metric = check.record(`proof.report.metrics[${index}]`, entry);
                    check.text(`proof.report.metrics[${index}].label`, metric.label, { max: 40 });
                    check.text(`proof.report.metrics[${index}].before`, metric.before, { max: 20 });
                    check.text(`proof.report.metrics[${index}].after`, metric.after, { max: 20 });
                });
                check.series("proof.report.impressions", report.impressions);
                if (Array.isArray(report.impressions) && report.impressions.length !== points.length) {
                    check.fail("proof.report.impressions", "needs one value for each month of clicks");
                }
                if (report.markers !== undefined) {
                    check.list("proof.report.markers", report.markers, { max: 6 }).forEach((entry, index) => {
                        const marker = check.record(`proof.report.markers[${index}]`, entry);
                        check.number(`proof.report.markers[${index}].index`, marker.index, {
                            min: 0,
                            max: Math.max(points.length - 1, 0),
                            integer: true,
                        });
                        check.text(`proof.report.markers[${index}].label`, marker.label, { max: 4 });
                    });
                }
            }
            break;
        }
        case "social": {
            check.text("proof.platform", proof.platform, { max: 40 });
            check.text("proof.handle", proof.handle, { max: 60 });
            check.image("proof.avatar", proof.avatar);
            check.list("proof.posts", proof.posts, { min: 3, max: 9 }).forEach((post, index) => check.image(`proof.posts[${index}]`, post));
            check.list("proof.profileStats", proof.profileStats, { min: 1, max: 3 }).forEach((entry, index) => {
                const stat = check.record(`proof.profileStats[${index}]`, entry);
                check.text(`proof.profileStats[${index}].label`, stat.label, { max: 20 });
                check.text(`proof.profileStats[${index}].value`, stat.value, { max: 20 });
            });
            const growth = check.record("proof.growth", proof.growth);
            check.text("proof.growth.label", growth.label, { max: 40 });
            check.series("proof.growth.points", growth.points);
            if (proof.profile !== undefined) {
                const profile = check.record("proof.profile", proof.profile);
                check.text("proof.profile.name", profile.name, { max: 60 });
                check.list("proof.profile.bio", profile.bio, { max: 4 }).forEach((line, index) =>
                    check.text(`proof.profile.bio[${index}]`, line, { max: 80 }),
                );
                check.text("proof.profile.action", profile.action, { required: false, max: 30 });
            }
            break;
        }
        case "ads": {
            check.text("proof.platform", proof.platform, { max: 40 });
            const ad = check.record("proof.ad", proof.ad);
            check.text("proof.ad.siteName", ad.siteName, { max: 80 });
            check.text("proof.ad.url", ad.url, { max: 120 });
            check.text("proof.ad.headline", ad.headline, { max: 120 });
            check.text("proof.ad.description", ad.description, { max: 300 });
            check.list("proof.comparisons", proof.comparisons, { min: 1, max: 4 }).forEach((entry, index) => {
                const item = check.record(`proof.comparisons[${index}]`, entry);
                check.text(`proof.comparisons[${index}].label`, item.label, { max: 60 });
                check.number(`proof.comparisons[${index}].before`, item.before, { min: 0 });
                check.number(`proof.comparisons[${index}].after`, item.after, { min: 0 });
                if (!["inr", "number", "percent", "multiplier"].includes(String(item.format))) {
                    check.fail(`proof.comparisons[${index}].format`, "must be inr, number, percent or multiplier");
                }
            });
            break;
        }
        case "video":
            check.text("proof.title", proof.title, { max: 60 });
            check.text("proof.duration", proof.duration, { max: 10 });
            check.image("proof.poster", proof.poster);
            check.link("proof.video", proof.video, { required: false });
            check.list("proof.stills", proof.stills, { max: 6 }).forEach((still, index) => check.image(`proof.stills[${index}]`, still));
            check.list("proof.channels", proof.channels, { max: 6 }).forEach((channel, index) =>
                check.text(`proof.channels[${index}]`, channel, { max: 40 }),
            );
            break;
        case "influencer":
            check.list("proof.creators", proof.creators, { min: 1, max: 12 }).forEach((entry, index) => {
                const creator = check.record(`proof.creators[${index}]`, entry);
                check.text(`proof.creators[${index}].name`, creator.name, { max: 60 });
                check.text(`proof.creators[${index}].handle`, creator.handle, { max: 60 });
                check.text(`proof.creators[${index}].followers`, creator.followers, { max: 12 });
                check.text(`proof.creators[${index}].initials`, creator.initials, { max: 3 });
            });
            check.list("proof.content", proof.content, { min: 1, max: 6 }).forEach((item, index) => {
                check.image(`proof.content[${index}]`, item);
                check.text(`proof.content[${index}].handle`, isRecord(item) ? item.handle : undefined, { max: 60 });
            });
            break;
        case "branding":
            if (proof.before !== undefined) check.image("proof.before", proof.before);
            check.image("proof.after", proof.after);
            check.list("proof.palette", proof.palette, { min: 1, max: 8 }).forEach((entry, index) => {
                const swatch = check.record(`proof.palette[${index}]`, entry);
                check.text(`proof.palette[${index}].name`, swatch.name, { max: 30 });
                if (typeof swatch.hex !== "string" || !HEX_PATTERN.test(swatch.hex)) {
                    check.fail(`proof.palette[${index}].hex`, "must be a colour like #3B2A1E");
                }
            });
            check.list("proof.applications", proof.applications, { max: 6 }).forEach((image, index) =>
                check.image(`proof.applications[${index}]`, image),
            );
            break;
        default:
            check.fail("proof.type", "is not a known proof type");
    }
}

function checkInsight(check: Checker, value: unknown, index: number) {
    const path = `insights[${index}]`;
    const insight = check.record(path, value);
    check.text(`${path}.title`, insight.title, { max: 80 });
    check.text(`${path}.note`, insight.note, { required: false, max: 300 });

    switch (insight.type) {
        case "search-results": {
            check.text(`${path}.query`, insight.query, { max: 80 });
            check.number(`${path}.position`, insight.position, { min: 1, max: 20, integer: true });
            const result = check.record(`${path}.result`, insight.result);
            for (const key of ["siteName", "url", "title", "description"]) {
                check.text(`${path}.result.${key}`, result[key], { max: 300 });
            }
            if (insight.mapPack !== undefined) {
                const pack = check.record(`${path}.mapPack`, insight.mapPack);
                check.text(`${path}.mapPack.name`, pack.name, { max: 60 });
                check.number(`${path}.mapPack.rating`, pack.rating, { min: 0, max: 5 });
                check.number(`${path}.mapPack.reviews`, pack.reviews, { min: 0, integer: true });
                check.text(`${path}.mapPack.detail`, pack.detail, { max: 80 });
            }
            break;
        }
        case "rank-movement":
            check.list(`${path}.keywords`, insight.keywords, { min: 1, max: 10 }).forEach((entry, item) => {
                const keyword = check.record(`${path}.keywords[${item}]`, entry);
                check.text(`${path}.keywords[${item}].term`, keyword.term, { max: 80 });
                if (keyword.before !== null) check.number(`${path}.keywords[${item}].before`, keyword.before, { min: 1 });
                check.number(`${path}.keywords[${item}].after`, keyword.after, { min: 1 });
            });
            break;
        case "score-rings":
            check.list(`${path}.scores`, insight.scores, { min: 1, max: 4 }).forEach((entry, item) => {
                const score = check.record(`${path}.scores[${item}]`, entry);
                check.text(`${path}.scores[${item}].label`, score.label, { max: 30 });
                check.number(`${path}.scores[${item}].before`, score.before, { min: 0, max: 100 });
                check.number(`${path}.scores[${item}].after`, score.after, { min: 0, max: 100 });
            });
            break;
        case "message-inbox":
            check.list(`${path}.messages`, insight.messages, { min: 1, max: 6 }).forEach((entry, item) => {
                const message = check.record(`${path}.messages[${item}]`, entry);
                for (const key of ["from", "text", "time", "reply"]) {
                    check.text(`${path}.messages[${item}].${key}`, message[key], { max: 160 });
                }
            });
            check.list(`${path}.summary`, insight.summary, { max: 2 }).forEach((kpi, item) => check.kpi(`${path}.summary[${item}]`, kpi));
            break;
        case "post-stats":
            check.image(`${path}.image`, insight.image);
            check.text(`${path}.caption`, insight.caption, { max: 80 });
            check.kpi(`${path}.headline`, insight.headline);
            check.list(`${path}.stats`, insight.stats, { max: 4 }).forEach((kpi, item) => check.kpi(`${path}.stats[${item}]`, kpi));
            break;
        case "bars":
            check.series(`${path}.bars`, insight.bars, { min: 1 });
            check.text(`${path}.prefix`, insight.prefix, { required: false, max: 4 });
            check.text(`${path}.suffix`, insight.suffix, { required: false, max: 6 });
            break;
        case "weekly-combo": {
            const labels = check.list(`${path}.labels`, insight.labels, { min: 2, max: 60 });
            const bars = check.record(`${path}.bars`, insight.bars);
            const line = check.record(`${path}.line`, insight.line);
            check.text(`${path}.bars.label`, bars.label, { max: 40 });
            check.text(`${path}.line.label`, line.label, { max: 40 });
            for (const [name, values] of [
                ["bars", bars.values],
                ["line", line.values],
            ] as const) {
                const list = check.list(`${path}.${name}.values`, values, { min: 2, max: 60 });
                list.forEach((number, item) => check.number(`${path}.${name}.values[${item}]`, number, { min: 0 }));
                if (list.length !== labels.length) check.fail(`${path}.${name}.values`, "needs one value per label");
            }
            break;
        }
        case "funnel": {
            const stages = check.list(`${path}.stages`, insight.stages, { min: 2, max: 6 });
            stages.forEach((entry, item) => {
                const stage = check.record(`${path}.stages[${item}]`, entry);
                check.text(`${path}.stages[${item}].label`, stage.label, { max: 40 });
                check.number(`${path}.stages[${item}].value`, stage.value, { min: 0 });
                const previous = item > 0 && isRecord(stages[item - 1]) ? (stages[item - 1] as Record_).value : undefined;
                if (typeof previous === "number" && typeof stage.value === "number" && stage.value > previous) {
                    check.fail(`${path}.stages[${item}].value`, "cannot be bigger than the stage before");
                }
            });
            break;
        }
        case "landing-page":
            for (const key of ["url", "eyebrow", "heading", "price", "cta"]) {
                check.text(`${path}.${key}`, insight[key], { max: 120 });
            }
            check.list(`${path}.points`, insight.points, { max: 5 }).forEach((point, item) => check.text(`${path}.points[${item}]`, point, { max: 80 }));
            check.list(`${path}.fields`, insight.fields, { max: 5 }).forEach((field, item) => check.text(`${path}.fields[${item}]`, field, { max: 40 }));
            break;
        case "retention": {
            const points = check.list(`${path}.points`, insight.points, { min: 2, max: 40 });
            points.forEach((entry, item) => {
                const point = check.record(`${path}.points[${item}]`, entry);
                check.number(`${path}.points[${item}].second`, point.second, { min: 0 });
                check.number(`${path}.points[${item}].percent`, point.percent, { min: 0, max: 100 });
            });
            const first = isRecord(points[0]) ? points[0] : null;
            if (first && (first.second !== 0 || first.percent !== 100)) {
                check.fail(`${path}.points[0]`, "must be second 0 at 100%");
            }
            const hook = check.record(`${path}.hook`, insight.hook);
            check.number(`${path}.hook.until`, hook.until, { min: 1 });
            check.text(`${path}.hook.label`, hook.label, { max: 40 });
            break;
        }
        case "cuts":
            check.list(`${path}.versions`, insight.versions, { min: 1, max: 4 }).forEach((entry, item) => {
                const version = check.record(`${path}.versions[${item}]`, entry);
                check.text(`${path}.versions[${item}].label`, version.label, { max: 30 });
                if (!["16:9", "9:16", "1:1"].includes(String(version.ratio))) {
                    check.fail(`${path}.versions[${item}].ratio`, "must be 16:9, 9:16 or 1:1");
                }
                check.image(`${path}.versions[${item}].image`, version.image);
                check.text(`${path}.versions[${item}].use`, version.use, { max: 60 });
            });
            break;
        case "split":
            check.text(`${path}.total`, insight.total, { max: 12 });
            check.series(`${path}.parts`, insight.parts, { min: 2 });
            break;
        case "creator-leaderboard":
            check.list(`${path}.creators`, insight.creators, { min: 1, max: 12 }).forEach((entry, item) => {
                const creator = check.record(`${path}.creators[${item}]`, entry);
                check.text(`${path}.creators[${item}].handle`, creator.handle, { max: 60 });
                check.text(`${path}.creators[${item}].initials`, creator.initials, { max: 3 });
                check.text(`${path}.creators[${item}].code`, creator.code, { max: 30 });
                check.number(`${path}.creators[${item}].followers`, creator.followers, { min: 1, integer: true });
                check.number(`${path}.creators[${item}].signups`, creator.signups, { min: 0, integer: true });
            });
            break;
        case "logo-versions": {
            check.text(`${path}.name`, insight.name, { max: 40 });
            check.text(`${path}.monogram`, insight.monogram, { max: 3 });
            check.text(`${path}.tagline`, insight.tagline, { max: 40 });
            const colors = check.record(`${path}.colors`, insight.colors);
            for (const key of ["dark", "mid", "accent", "light"]) {
                if (typeof colors[key] !== "string" || !HEX_PATTERN.test(colors[key] as string)) {
                    check.fail(`${path}.colors.${key}`, "must be a colour like #3B2A1E");
                }
            }
            break;
        }
        case "type-specimen":
            check.list(`${path}.faces`, insight.faces, { min: 1, max: 3 }).forEach((entry, item) => {
                const face = check.record(`${path}.faces[${item}]`, entry);
                check.text(`${path}.faces[${item}].name`, face.name, { max: 40 });
                check.text(`${path}.faces[${item}].role`, face.role, { max: 60 });
                check.text(`${path}.faces[${item}].sample`, face.sample, { max: 200 });
                if (!["display", "text"].includes(String(face.family))) {
                    check.fail(`${path}.faces[${item}].family`, "must be display or text");
                }
            });
            break;
        default:
            check.fail(`${path}.type`, "is not a known insight type");
    }
}

/** Every image or video path anywhere in a value. */
export function collectMediaPaths(value: unknown, found: string[] = []): string[] {
    if (Array.isArray(value)) {
        value.forEach((item) => collectMediaPaths(item, found));
    } else if (isRecord(value)) {
        for (const [key, item] of Object.entries(value)) {
            if ((key === "src" || key === "video") && typeof item === "string") {
                found.push(item);
            } else {
                collectMediaPaths(item, found);
            }
        }
    }
    return found;
}

export function validateCaseStudy(input: unknown): CaseStudyValidation {
    const check = new Checker();
    if (!isRecord(input)) {
        return { ok: false, errors: ["The case study is empty."] };
    }

    const study = input;
    check.text("slug", study.slug, { max: 80 });
    if (typeof study.slug === "string" && (!SLUG_PATTERN.test(study.slug) || study.slug === "preview")) {
        check.fail("slug", "must be lowercase words joined by hyphens, and not \"preview\"");
    }
    if (!CASE_STUDY_STATUSES.includes(study.status as CaseStudyStatus)) {
        check.fail("status", "must be draft, sample or published");
    }

    check.text("client", study.client, { max: 80 });
    check.text("industry", study.industry, { max: 80 });
    check.text("location", study.location, { required: false, max: 60 });
    check.text("period", study.period, { required: false, max: 60 });
    check.text("summary", study.summary, { max: 320 });

    const services = check.list("services", study.services, { min: 1, max: 4 });
    services.forEach((id, index) => {
        if (typeof id !== "string" || !SERVICE_IDS.has(id)) check.fail(`services[${index}]`, "is not a known service");
    });
    if (new Set(services).size !== services.length) check.fail("services", "lists a service twice");

    if (study.featured !== undefined && typeof study.featured !== "boolean") check.fail("featured", "must be true or false");
    if (study.headline !== undefined) check.kpi("headline", study.headline);
    if (study.kpis !== undefined) {
        check.list("kpis", study.kpis, { max: 4 }).forEach((kpi, index) => check.kpi(`kpis[${index}]`, kpi));
    }
    if (study.scope !== undefined) {
        check.list("scope", study.scope, { max: 8 }).forEach((item, index) => check.text(`scope[${index}]`, item, { max: 40 }));
    }
    if (study.live !== undefined) {
        const live = check.record("live", study.live);
        check.link("live.url", live.url);
        if (typeof live.url === "string" && !live.url.startsWith("https://")) check.fail("live.url", "must start with https://");
        check.text("live.label", live.label, { max: 40 });
    }
    if (study.story !== undefined) {
        const story = check.record("story", study.story);
        check.text("story.challenge", story.challenge, { max: 800 });
        check.list("story.steps", story.steps, { min: 1, max: 6 }).forEach((entry, index) => {
            const step = check.record(`story.steps[${index}]`, entry);
            check.text(`story.steps[${index}].title`, step.title, { max: 80 });
            check.text(`story.steps[${index}].text`, step.text, { max: 400 });
            check.text(`story.steps[${index}].when`, step.when, { required: false, max: 30 });
        });
        check.text("story.result", story.result, { max: 600 });
        check.text("story.source", story.source, { required: false, max: 200 });
    }
    if (study.testimonial !== undefined) {
        const testimonial = check.record("testimonial", study.testimonial);
        check.text("testimonial.quote", testimonial.quote, { max: 400 });
        check.text("testimonial.name", testimonial.name, { max: 60 });
        check.text("testimonial.role", testimonial.role, { max: 80 });
    }

    const mainService = typeof services[0] === "string" && SERVICE_IDS.has(services[0]) ? (services[0] as PortfolioServiceId) : undefined;
    checkProof(check, check.record("proof", study.proof), mainService);

    if (study.insights !== undefined) {
        check.list("insights", study.insights, { max: 12 }).forEach((insight, index) => checkInsight(check, insight, index));
    }

    if (study.status === "published") {
        if (typeof study.slug === "string" && study.slug.startsWith("sample-")) {
            check.fail("slug", "a published case study cannot start with sample-");
        }
        if (collectMediaPaths(study).some((src) => src.startsWith(SAMPLE_IMAGE_PREFIX))) {
            check.fail("images", "a published case study cannot use the sample images; upload the client's own");
        }
    }

    if (check.errors.length) {
        return { ok: false, errors: check.errors };
    }

    const value: Record_ = {};
    for (const key of TOP_LEVEL_KEYS) {
        if (study[key] !== undefined) value[key] = study[key];
    }
    return { ok: true, value: value as unknown as PortfolioCaseStudy };
}
