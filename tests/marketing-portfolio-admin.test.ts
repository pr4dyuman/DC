import test from "node:test";
import assert from "node:assert/strict";

import {
    PORTFOLIO_SERVICES,
    PROOF_TYPE_FOR_SERVICE,
    SERVICE_EXAMPLES,
    filterServiceCaseStudies,
    findNextCaseStudy,
    getBuiltInCaseStudies,
    getServiceExamples,
    getStudyMark,
    hasCaseStudyPage,
    selectCaseStudies,
    type PortfolioCaseStudy,
} from "../lib/marketing-portfolio";
import {
    ADDABLE_INSIGHT_TYPES,
    HEADLINE_FIELD,
    INSIGHT_LABELS,
    KPIS_FIELD,
    LIVE_FIELD,
    PROOF_FIELDS,
    PROOF_LABELS,
    SCOPE_FIELD,
    STORY_FIELD,
    TESTIMONIAL_FIELD,
    createDraftCaseStudy,
    createInsight,
    createProof,
    getInsightFields,
    tidyCaseStudy,
    type FieldSpec,
} from "../lib/marketing-portfolio-editor";
import { INSIGHT_TYPES, collectMediaPaths, validateCaseStudy } from "../lib/marketing-portfolio-validation";

const BUILT_IN = getBuiltInCaseStudies();
const IMAGE_KEYS = ["src", "width", "height", "alt"];

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function errorsOf(input: unknown) {
    const result = validateCaseStudy(input);
    return result.ok ? [] : result.errors;
}

/** Keys in a value that the editor has no field for. */
function missingFields(value: unknown, fields: FieldSpec[], path: string): string[] {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const missing: string[] = [];
    for (const [key, item] of Object.entries(value)) {
        const at = path ? `${path}.${key}` : key;
        const field = fields.find((entry) => entry.key === key);
        if (!field) {
            missing.push(at);
            continue;
        }
        if (field.kind === "group") missing.push(...missingFields(item, field.fields, at));
        if (field.kind === "list" && Array.isArray(item)) {
            item.forEach((entry, index) => missing.push(...missingFields(entry, field.item, `${at}[${index}]`)));
        }
        if (field.kind === "image" && item && typeof item === "object") {
            const known = [...IMAGE_KEYS, ...(field.extra || []).map((extra) => extra.key)];
            missing.push(...Object.keys(item).filter((name) => !known.includes(name)).map((name) => `${at}.${name}`));
        }
        if (field.kind === "images" && Array.isArray(item)) {
            const known = [...IMAGE_KEYS, ...(field.extra || []).map((extra) => extra.key)];
            item.forEach((entry, index) =>
                missing.push(...Object.keys(entry).filter((name) => !known.includes(name)).map((name) => `${at}[${index}].${name}`)),
            );
        }
    }
    return missing;
}

test("every built-in case study passes the checks", () => {
    assert.ok(BUILT_IN.length > 0);
    for (const study of BUILT_IN) {
        assert.deepEqual(errorsOf(clone(study)), [], study.slug);
    }
});

test("the checks keep only the case study's own fields", () => {
    const result = validateCaseStudy({ ...clone(BUILT_IN[0]), injected: "<script>" });
    assert.ok(result.ok);
    assert.equal("injected" in result.value, false);
});

test("a published case study cannot be a sample or use the sample images", () => {
    const sample = BUILT_IN.find(
        (study) => study.status === "sample" && collectMediaPaths(study).some((src) => src.startsWith("/portfolio/samples/")),
    );
    assert.ok(sample, "a sample with sample images exists");

    const asIs = errorsOf({ ...clone(sample), status: "published" });
    assert.ok(asIs.some((error) => error.startsWith("slug:")), asIs.join("; "));
    assert.ok(asIs.some((error) => error.startsWith("images:")), asIs.join("; "));

    const renamed = errorsOf({ ...clone(sample), slug: "real-client", status: "published" });
    assert.deepEqual(
        renamed.map((error) => error.split(":")[0]),
        ["images"],
    );

    assert.deepEqual(errorsOf({ ...clone(sample), slug: "real-client", status: "draft" }), []);
});

test("the checks report broken input by field", () => {
    const seo = clone(BUILT_IN.find((study) => study.proof.type === "seo") as PortfolioCaseStudy);
    const points = (seo.proof as { points: Array<{ label: string; value: unknown }> }).points;
    points[2].value = "lots";
    assert.ok(errorsOf(seo).some((error) => error.startsWith("proof.points[2].value:")));

    const otherService = { ...clone(BUILT_IN.find((study) => study.proof.type === "seo") as PortfolioCaseStudy), services: ["social"] };
    assert.ok(errorsOf(otherService).some((error) => error.startsWith("proof.type:")));

    for (const slug of ["Has Spaces", "preview", "-dash", ""]) {
        const study = { ...clone(BUILT_IN[0]), slug };
        assert.ok(errorsOf(study).some((error) => error.startsWith("slug:")), slug);
    }

    assert.ok(errorsOf({ ...clone(BUILT_IN[0]), status: "live" }).some((error) => error.startsWith("status:")));
    assert.ok(errorsOf({ ...clone(BUILT_IN[0]), services: ["web", "web"] }).some((error) => error.startsWith("services:")));
    assert.deepEqual(errorsOf(null), ["The case study is empty."]);
});

test("tidying drops cleared text but keeps nulls, zeros and blank list entries", () => {
    const tidy = tidyCaseStudy({
        a: "",
        b: undefined,
        c: null,
        d: ["", "Jul"],
        e: { f: "", g: 0, h: false, i: [{ j: "" }] },
    });
    assert.deepEqual(tidy, { c: null, d: ["", "Jul"], e: { g: 0, h: false, i: [{}] } });
});

test("a new draft for any service is valid and uses that service's proof", () => {
    for (const service of PORTFOLIO_SERVICES) {
        const draft = createDraftCaseStudy(service.id);
        assert.equal(draft.status, "draft", service.id);
        assert.equal(draft.services[0], service.id);
        assert.equal(draft.proof.type, PROOF_TYPE_FOR_SERVICE[service.id]);
        assert.equal(draft.featured, false);
        assert.equal(draft.testimonial, undefined, "quotes are never copied into a new case study");
        assert.deepEqual(errorsOf(tidyCaseStudy(clone(draft))), [], service.id);
    }
});

test("switching the main service starts a valid proof for it", () => {
    for (const service of PORTFOLIO_SERVICES) {
        const type = PROOF_TYPE_FOR_SERVICE[service.id];
        const proof = createProof(type);
        assert.equal(proof.type, type);
        assert.ok(PROOF_LABELS[type]);
        const draft = { ...createDraftCaseStudy(service.id), proof };
        assert.deepEqual(errorsOf(tidyCaseStudy(clone(draft))), [], service.id);
    }
});

test("every kind of extra visual can be added and passes the checks", () => {
    assert.deepEqual([...ADDABLE_INSIGHT_TYPES].sort(), [...INSIGHT_TYPES].sort());
    const base = clone(BUILT_IN.find((study) => study.status === "sample") as PortfolioCaseStudy);
    for (const type of ADDABLE_INSIGHT_TYPES) {
        const insight = createInsight(type);
        assert.equal(insight.type, type);
        assert.ok(INSIGHT_LABELS[type]?.name, type);
        assert.deepEqual(errorsOf({ ...base, insights: [insight] }), [], type);
    }
});

test("the editor has a field for everything a case study can hold", () => {
    for (const study of BUILT_IN) {
        const { type, ...proof } = study.proof;
        assert.deepEqual(missingFields(proof, PROOF_FIELDS[type], "proof"), [], `${study.slug} proof`);

        (study.insights || []).forEach((insight, index) => {
            const { type: insightType, ...rest } = insight;
            assert.deepEqual(missingFields(rest, getInsightFields(insightType), `insights[${index}]`), [], `${study.slug} ${insightType}`);
        });

        const { headline, kpis, scope, story, testimonial, live } = study;
        assert.deepEqual(
            missingFields(
                clone({ headline, kpis, scope, story, testimonial, live }),
                [HEADLINE_FIELD, KPIS_FIELD, SCOPE_FIELD, STORY_FIELD, TESTIMONIAL_FIELD, LIVE_FIELD],
                "",
            ),
            [],
            study.slug,
        );
    }
});

test("pages pick what to show from any list of case studies", () => {
    const list: PortfolioCaseStudy[] = [
        { ...clone(BUILT_IN.find((study) => study.proof.type === "seo") as PortfolioCaseStudy), slug: "real-seo", status: "published" },
        { ...clone(BUILT_IN.find((study) => study.proof.type === "social") as PortfolioCaseStudy), slug: "draft-social", status: "draft" },
        { ...clone(BUILT_IN.find((study) => study.proof.type === "ads") as PortfolioCaseStudy), slug: "sample-ads", status: "sample" },
        { ...clone(BUILT_IN.find((study) => study.proof.type === "video") as PortfolioCaseStudy), slug: "real-video", status: "published" },
    ];

    assert.deepEqual(selectCaseStudies(list).map((study) => study.slug), ["real-seo", "real-video"]);
    assert.equal(selectCaseStudies(list, { includeSamples: true }).length, 4);

    assert.deepEqual(filterServiceCaseStudies(list, ["seo"]).map((study) => study.slug), ["real-seo"]);
    assert.deepEqual(filterServiceCaseStudies(list, ["social"]), [], "drafts never reach a service page");
    assert.deepEqual(filterServiceCaseStudies(list, ["ads"]).map((study) => study.slug), ["real-video"], "secondary services count");

    assert.equal(getStudyMark(list[0]), false);
    assert.equal(getStudyMark(list[1]), "Draft");
    assert.equal(getStudyMark(list[2]), "Sample");

    const withPages = list.filter(hasCaseStudyPage);
    assert.ok(withPages.length >= 2);
    assert.equal(findNextCaseStudy(withPages[withPages.length - 1], list)?.slug, withPages[0].slug, "wraps round");
    assert.equal(findNextCaseStudy(list[0], [list[0]]), null);
});

test("services without published work show their example, and only those", () => {
    const examples = getServiceExamples(BUILT_IN);
    const withPages = PORTFOLIO_SERVICES.filter((service) => service.href && !["web", "app"].includes(service.id));
    assert.deepEqual(
        examples.map(({ service }) => service.id),
        withPages.map((service) => service.id),
        "every service with a page and no published work has an example",
    );
    for (const { service, study, copy } of examples) {
        assert.equal(study.status, "sample", service.id);
        assert.equal(study.services[0], service.id);
        assert.ok(copy.title && copy.text && copy.includes.length >= 3, service.id);
    }

    assert.deepEqual(getServiceExamples(BUILT_IN, ["seo"]).map(({ service }) => service.id), ["seo"]);
    assert.deepEqual(getServiceExamples(BUILT_IN, ["web", "app"]), [], "websites have real projects");

    const realSeo = { ...clone(BUILT_IN.find((study) => study.proof.type === "seo") as PortfolioCaseStudy), slug: "real-seo", status: "published" as const };
    const withRealSeo = [...BUILT_IN, realSeo];
    assert.equal(getServiceExamples(withRealSeo, ["seo"]).length, 0, "a published case study replaces the example");

    const realVideoWithAds = {
        ...clone(BUILT_IN.find((study) => study.proof.type === "video") as PortfolioCaseStudy),
        slug: "real-video",
        status: "published" as const,
        services: ["video", "ads"] as PortfolioCaseStudy["services"],
    };
    assert.equal(getServiceExamples([...BUILT_IN, realVideoWithAds], ["ads"]).length, 0, "secondary services count as covered");

    const withoutSamples = BUILT_IN.filter((study) => study.status !== "sample");
    assert.deepEqual(getServiceExamples(withoutSamples), [], "deleting a sample removes its example");

    for (const id of Object.keys(SERVICE_EXAMPLES)) {
        assert.ok(PORTFOLIO_SERVICES.some((service) => service.id === id && service.href), `${id} has a service page`);
    }
});
