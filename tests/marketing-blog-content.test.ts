import test from "node:test";
import assert from "node:assert/strict";

import { buildMarketingBlogHtml } from "../lib/marketing-blog-content";

test("buildMarketingBlogHtml converts markdown tables into html tables", () => {
    const html = buildMarketingBlogHtml([
        "## Decision Matrix",
        "| Asset Type | Production Weight | Primary Goal |",
        "|:---|:---|:---|",
        "| **Strategic Hero** | High | Brand Authority |",
        "| Technical Deep-Dive | Medium | Trust & Validation |",
    ].join("\n"));

    assert.match(html, /<h2>Decision Matrix<\/h2>/i);
    assert.match(html, /<table>/i);
    assert.match(html, /<th>Asset Type<\/th>/i);
    assert.match(html, /<td><strong>Strategic Hero<\/strong><\/td>/i);
    assert.doesNotMatch(html, /\| Asset Type \| Production Weight \| Primary Goal \|/i);
});

test("buildMarketingBlogHtml converts same-line references into clickable markdown links", () => {
    const html = buildMarketingBlogHtml([
        "## References",
        "[1] The Ultimate Guide to Content Distribution [rosssimmonds.com] https://rosssimmonds.com/blog/content-distribution-guide/",
    ].join("\n"));

    assert.match(
        html,
        /<h2>References<\/h2>/i,
    );
    assert.match(
        html,
        /<a href="https:\/\/rosssimmonds\.com\/blog\/content-distribution-guide\/">The Ultimate Guide to Content Distribution \(rosssimmonds\.com\)<\/a>/i,
    );
    assert.doesNotMatch(html, />https:\/\/rosssimmonds\.com\/blog\/content-distribution-guide\/</i);
});

test("buildMarketingBlogHtml converts split reference label and url lines into one clickable link", () => {
    const html = buildMarketingBlogHtml([
        "## Sources",
        "[1] Search Engine Land SEO overview [searchengineland.com]",
        "https://searchengineland.com/guide/what-is-seo",
    ].join("\n"));

    assert.match(
        html,
        /<a href="https:\/\/searchengineland\.com\/guide\/what-is-seo">Search Engine Land SEO overview \(searchengineland\.com\)<\/a>/i,
    );
    assert.doesNotMatch(html, />https:\/\/searchengineland\.com\/guide\/what-is-seo</i);
});

test("buildMarketingBlogHtml uses stored external sources when markdown references only contain plain text labels", () => {
    const html = buildMarketingBlogHtml(
        [
            "## Sources",
            "- [1] Balancing Speed and Quality: A CFO's Guide to Protecting Margins in E&HT | PTC",
            "- [2] The Essential Guide to Balancing Speed and Quality in Operations | SmallBizClub",
        ].join("\n"),
        {
            externalSources: [
                {
                    title: "Balancing Speed and Quality: A CFO's Guide to Protecting Margins in E&HT",
                    url: "https://www.ptc.com/en/blogs/iiot/balancing-speed-and-quality",
                    domain: "ptc.com",
                },
                {
                    title: "The Essential Guide to Balancing Speed and Quality in Operations",
                    url: "https://smallbizclub.com/operations/the-essential-guide-to-balancing-speed-and-quality-in-operations/",
                    domain: "smallbizclub.com",
                },
            ],
        },
    );

    assert.match(
        html,
        /<li>\[1\]\s*<a href="https:\/\/www\.ptc\.com\/en\/blogs\/iiot\/balancing-speed-and-quality">Balancing Speed and Quality: A CFO&#39;s Guide to Protecting Margins in E&amp;HT \| PTC<\/a><\/li>/i,
    );
    assert.match(
        html,
        /<li>\[2\]\s*<a href="https:\/\/smallbizclub\.com\/operations\/the-essential-guide-to-balancing-speed-and-quality-in-operations\/">The Essential Guide to Balancing Speed and Quality in Operations \| SmallBizClub<\/a><\/li>/i,
    );
});

test("buildMarketingBlogHtml enriches stored html sources from external source metadata", () => {
    const html = buildMarketingBlogHtml(
        [
            "<h2>Sources</h2>",
            "<ul>",
            "<li>[1] Enterprise AI in 2026: A practical guide for Microsoft customers | Rand Group</li>",
            "<li>[2] Enterprise AI Roadmap: The Complete 2026 Guide | RTS Labs</li>",
            "</ul>",
        ].join(""),
        {
            externalSources: [
                {
                    title: "Enterprise AI in 2026: A practical guide for Microsoft customers",
                    url: "https://www.randgroup.com/insights/microsoft/enterprise-ai-in-2026-a-practical-guide-for-microsoft-customers/",
                    domain: "randgroup.com",
                },
                {
                    title: "Enterprise AI Roadmap: The Complete 2026 Guide",
                    url: "https://rtslabs.com/blog/enterprise-ai-roadmap-the-complete-2026-guide/",
                    domain: "rtslabs.com",
                },
            ],
        },
    );

    assert.match(
        html,
        /<li>\[1\]\s*<a href="https:\/\/www\.randgroup\.com\/insights\/microsoft\/enterprise-ai-in-2026-a-practical-guide-for-microsoft-customers\/">Enterprise AI in 2026: A practical guide for Microsoft customers \| Rand Group<\/a><\/li>/i,
    );
    assert.match(
        html,
        /<li>\[2\]\s*<a href="https:\/\/rtslabs\.com\/blog\/enterprise-ai-roadmap-the-complete-2026-guide\/">Enterprise AI Roadmap: The Complete 2026 Guide \| RTS Labs<\/a><\/li>/i,
    );
});
