import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import {
    PORTFOLIO_SERVICES,
    PROOF_TYPE_FOR_SERVICE,
    getNextCaseStudy,
    getPortfolioCaseStudies,
    getPortfolioCaseStudy,
    getServiceCaseStudies,
    hasCaseStudyPage,
    type PortfolioCaseStudy,
    type PortfolioServiceId,
} from "../lib/marketing-portfolio";
import { MARKETING_SAMPLE_PREVIEW_ORDER } from "../lib/marketing-portfolio-samples";
import {
    averageWatchedPercent,
    buildLineChart,
    formatCompactNumber,
    formatComparisonValue,
    formatParsedKpi,
    niceScale,
    parseKpiValue,
    percentChange,
} from "../lib/marketing-portfolio-charts";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ALL = getPortfolioCaseStudies({ includeSamples: true });
const PUBLISHED = getPortfolioCaseStudies();
const SERVICE_IDS = PORTFOLIO_SERVICES.map((service) => service.id);

function collectSources(value: unknown, found: string[] = []): string[] {
    if (Array.isArray(value)) {
        value.forEach((item) => collectSources(item, found));
    } else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) {
            if ((key === "src" || key === "video") && typeof item === "string") {
                found.push(item);
            } else {
                collectSources(item, found);
            }
        }
    }
    return found;
}

test("case study slugs are unique, URL-safe and never 'preview'", () => {
    const slugs = ALL.map((study) => study.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) {
        assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        assert.notEqual(slug, "preview", "/portfolio/preview is the preview page");
    }
});

test("every case study uses known services and the proof for its main service", () => {
    for (const study of ALL) {
        assert.ok(study.services.length > 0, `${study.slug}: no services`);
        for (const id of study.services) {
            assert.ok(SERVICE_IDS.includes(id), `${study.slug}: unknown service ${id}`);
        }
        assert.equal(study.proof.type, PROOF_TYPE_FOR_SERVICE[study.services[0]], `${study.slug}: proof type`);
    }
});

test("sample case studies never reach the public portfolio or service pages", () => {
    assert.ok(ALL.some((study) => study.status === "sample"), "the preview needs samples");
    assert.ok(PUBLISHED.every((study) => study.status === "published"));
    for (const study of ALL.filter((item) => item.status === "sample")) {
        assert.match(study.slug, /^sample-/, `${study.slug}: sample slugs start with sample-`);
        assert.equal(getPortfolioCaseStudy(study.slug), undefined, `${study.slug} is public`);
    }
    for (const id of SERVICE_IDS as PortfolioServiceId[]) {
        assert.ok(getServiceCaseStudies([id]).every((study) => study.status === "published"));
    }
});

test("published case studies never use sample images", () => {
    for (const study of PUBLISHED) {
        const samples = collectSources([study.proof, study.insights]).filter((src) => src.startsWith("/portfolio/samples/"));
        assert.deepEqual(samples, [], `${study.slug} uses sample images`);
    }
});

test("every image and video a case study uses exists in public/", () => {
    for (const study of ALL) {
        for (const src of collectSources([study.proof, study.insights])) {
            const file = path.join(PUBLIC_DIR, src.split("?")[0]);
            assert.ok(existsSync(file), `${study.slug}: missing ${src}`);
        }
    }
});

test("headline numbers render in the display font and count up to the exact text", () => {
    for (const study of ALL) {
        if (!study.headline) continue;
        const { value } = study.headline;
        assert.ok(!/[₹→]/.test(value), `${study.slug}: the display font has no ₹ or →; put currency in the label`);
        const parsed = parseKpiValue(value);
        if (parsed) {
            assert.equal(formatParsedKpi(parsed, parsed.number), value, `${study.slug}: count-up would end on different text`);
        }
    }
});

test("proof data is complete enough to draw", () => {
    for (const study of ALL) {
        const { proof } = study;
        if (proof.type === "seo") {
            assert.ok(proof.points.length >= 2, `${study.slug}: needs two or more months`);
            if (proof.startIndex !== undefined) {
                assert.ok(proof.startIndex >= 0 && proof.startIndex < proof.points.length, `${study.slug}: startIndex`);
            }
        }
        if (proof.type === "social") {
            assert.ok(proof.growth.points.length >= 2, `${study.slug}: needs two or more growth points`);
            assert.ok(proof.posts.length >= 9, `${study.slug}: the phone grid shows nine posts`);
        }
        if (proof.type === "ads") {
            for (const comparison of proof.comparisons) {
                assert.ok(comparison.before > 0 && comparison.after > 0, `${study.slug}: ${comparison.label}`);
            }
        }
    }
});

test("the preview order lists real case studies only", () => {
    const slugs = new Set(ALL.map((study) => study.slug));
    for (const slug of MARKETING_SAMPLE_PREVIEW_ORDER) {
        assert.ok(slugs.has(slug), `preview order lists unknown slug ${slug}`);
    }
});

test("the next case study wraps around and skips studies without a page", () => {
    const withPages = ALL.filter(hasCaseStudyPage);
    const last = withPages[withPages.length - 1] as PortfolioCaseStudy;
    assert.equal(getNextCaseStudy(last, { includeSamples: true })?.slug, withPages[0].slug);
    for (const study of withPages) {
        const next = getNextCaseStudy(study, { includeSamples: true });
        assert.ok(next && hasCaseStudyPage(next));
    }
});

test("chart scales start at zero and end on a round number above the data", () => {
    assert.deepEqual(niceScale(4120), { top: 5000, step: 1000, ticks: [0, 1000, 2000, 3000, 4000, 5000] });
    assert.equal(niceScale(9870).top, 10000);
    assert.equal(niceScale(142).top, 150);
    assert.equal(niceScale(0).top, 1);

    const chart = buildLineChart([0, 50, 100], 200, 100, { top: 0, right: 0, bottom: 0, left: 0 });
    assert.equal(chart.line, "M0 100 L100 50 L200 0");
    assert.ok(chart.area.endsWith("Z"));
});

test("numbers are formatted the way the cards show them", () => {
    assert.equal(formatCompactNumber(4120), "4.1k");
    assert.equal(formatCompactNumber(1_200_000), "1.2M");
    assert.equal(formatCompactNumber(2500), "2.5k");
    assert.equal(formatComparisonValue(640, "inr"), "₹640");
    assert.equal(formatComparisonValue(5.4, "multiplier"), "5.4×");
    assert.equal(percentChange(640, 210), -67);
    assert.equal(percentChange(38, 142), 274);

    assert.deepEqual(parseKpiValue("+402%"), {
        prefix: "+",
        number: 402,
        decimals: 0,
        grouped: false,
        locale: "en-US",
        suffix: "%",
    });
    assert.equal(parseKpiValue("0:30"), null);
    for (const value of ["−67%", "1.2M", "1,380", "3.1×", "#3", "1,23,456", "123,456"]) {
        const parsed = parseKpiValue(value);
        assert.ok(parsed, value);
        assert.equal(formatParsedKpi(parsed, parsed.number), value);
    }
});

test("insight data is complete and consistent enough to draw", () => {
    for (const study of ALL) {
        for (const insight of study.insights || []) {
            const where = `${study.slug}: ${insight.type}`;
            assert.ok(insight.title, `${where} needs a title`);

            switch (insight.type) {
                case "search-results":
                    assert.ok(insight.position >= 1, where);
                    assert.ok(insight.result.title && insight.result.url, where);
                    break;
                case "rank-movement":
                    for (const keyword of insight.keywords) {
                        assert.ok(keyword.after >= 1, `${where}: ${keyword.term}`);
                        assert.ok(keyword.before === null || keyword.before > keyword.after, `${where}: ${keyword.term} should climb`);
                    }
                    break;
                case "score-rings":
                    for (const score of insight.scores) {
                        for (const value of [score.before, score.after]) {
                            assert.ok(value >= 0 && value <= 100, `${where}: ${score.label}`);
                        }
                    }
                    break;
                case "weekly-combo":
                    assert.equal(insight.bars.values.length, insight.labels.length, where);
                    assert.equal(insight.line.values.length, insight.labels.length, where);
                    break;
                case "funnel":
                    insight.stages.slice(1).forEach((stage, index) => {
                        assert.ok(stage.value < insight.stages[index].value, `${where}: ${stage.label} should be smaller`);
                    });
                    break;
                case "retention":
                    assert.deepEqual(insight.points[0], { second: 0, percent: 100 }, where);
                    insight.points.slice(1).forEach((point, index) => {
                        assert.ok(point.second > insight.points[index].second, where);
                        assert.ok(point.percent <= insight.points[index].percent, where);
                    });
                    break;
                case "split":
                    assert.equal(
                        formatCompactNumber(insight.parts.reduce((total, part) => total + part.value, 0)),
                        insight.total,
                        `${where}: parts should add up to the total`,
                    );
                    break;
                case "bars":
                    assert.ok(insight.bars.every((bar) => bar.value > 0), where);
                    break;
                default:
                    break;
            }
        }
    }
});

test("an SEO report lines up with its clicks and story", () => {
    for (const study of ALL) {
        if (study.proof.type !== "seo" || !study.proof.report) continue;
        const { points, report } = study.proof;
        assert.equal(report.impressions.length, points.length, study.slug);
        assert.deepEqual(
            report.impressions.map((point) => point.label),
            points.map((point) => point.label),
            study.slug,
        );
        for (const marker of report.markers || []) {
            assert.ok(marker.index >= 0 && marker.index < points.length, `${study.slug}: marker ${marker.label}`);
        }
        assert.ok((report.markers || []).length <= (study.story?.steps.length || 0), study.slug);
    }
});

test("sample numbers agree from one panel to the next", () => {
    const video = getPortfolioCaseStudy("sample-video-real-estate", { includeSamples: true });
    const retention = video?.insights?.find((insight) => insight.type === "retention");
    assert.ok(retention && retention.type === "retention");
    const completion = video?.kpis?.find((kpi) => kpi.label === "average view completion");
    assert.equal(`${averageWatchedPercent(retention.points)}%`, completion?.value);

    const ads = getPortfolioCaseStudy("sample-ads-dental-clinic", { includeSamples: true });
    const weekly = ads?.insights?.find((insight) => insight.type === "weekly-combo");
    assert.ok(weekly && weekly.type === "weekly-combo" && ads?.proof.type === "ads");
    const leads = ads.proof.comparisons.find((comparison) => comparison.label === "Leads per month");
    const monthStarts = weekly.labels.flatMap((label, index) => (label ? [index] : []));
    const monthTotal = (start: number, end: number) => weekly.bars.values.slice(start, end).reduce((a, b) => a + b, 0);
    assert.equal(monthTotal(monthStarts[0], monthStarts[1]), leads?.before);
    assert.equal(monthTotal(monthStarts[monthStarts.length - 1], weekly.labels.length), leads?.after);

    const influencer = getPortfolioCaseStudy("sample-influencer-skincare", { includeSamples: true });
    const board = influencer?.insights?.find((insight) => insight.type === "creator-leaderboard");
    assert.ok(board && board.type === "creator-leaderboard");
    const signups = board.creators.reduce((total, creator) => total + creator.signups, 0);
    assert.ok(signups <= Number(influencer?.headline?.value.replace(/,/g, "")), "top creators cannot beat the total");
});
