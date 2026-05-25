import test from "node:test";
import assert from "node:assert/strict";

import { countInternalLinks, extractInternalLinkTargets } from "../lib/ai-blogger-internal-link-utils";

function htmlResponse(body: string) {
    return new Response(body, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
        },
    });
}

test("extractInternalLinkTargets keeps relative product and collection links on the same domain", () => {
    const targets = extractInternalLinkTargets(
        [
            "Shop the [Pegasus 41](/products/pegasus-41) launch.",
            "<p>Browse the <a href=\"https://shop.example.com/collections/running-shoes\">running shoes collection</a>.</p>",
        ].join("\n"),
        "https://shop.example.com",
    );

    assert.deepEqual(
        targets.sort(),
        ["/collections/running-shoes", "/products/pegasus-41"],
    );
});

test("extractInternalLinkTargets counts homepage links as internal targets", () => {
    const targets = extractInternalLinkTargets(
        [
            "Read the [homepage](https://shop.example.com/) first.",
            "<a href=\"/\">Home</a>",
            "Visit https://shop.example.com for more context.",
        ].join("\n"),
        "https://shop.example.com",
    );

    assert.deepEqual(targets, ["/"]);
});

test("countInternalLinks includes homepage plus deeper same-domain pages", () => {
    const count = countInternalLinks(
        [
            "Read the [homepage](https://shop.example.com/).",
            "Then browse [dispatches](https://shop.example.com/blog).",
        ].join("\n"),
        "https://shop.example.com",
    );

    assert.equal(count, 2);
});

test("website intelligence classifies ecommerce collection, product, and brand pages", async () => {
    process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/codex-test";
    const { getAIBloggerWebsiteIntelligence } = await import("../lib/ai-blogger-website-intelligence");
    const originalFetch = globalThis.fetch;

    const pageMap = new Map<string, Response>([
        [
            "https://shop.example.com/",
            htmlResponse(`
                <html>
                    <head>
                        <title>Velocity Running Store</title>
                        <meta name="description" content="Shop premium running shoes, collections, and brand edits." />
                    </head>
                    <body>
                        <main>
                            <h1>Premium Running Shoes</h1>
                            <p>Explore curated collections, featured products, and trusted brand pages.</p>
                            <a href="/shop/running-shoes">Running Shoes Collection</a>
                            <a href="/nike-air-zoom-pegasus-41">Nike Air Zoom Pegasus 41</a>
                            <a href="/brands/nike">Nike Brand Page</a>
                        </main>
                    </body>
                </html>
            `),
        ],
        [
            "https://shop.example.com/shop/running-shoes",
            htmlResponse(`
                <html>
                    <head>
                        <title>Running Shoes Collection</title>
                        <meta name="description" content="Browse cushioned, stability, and race-day running shoes." />
                    </head>
                    <body>
                        <main>
                            <h1>Running Shoes Collection</h1>
                            <p>Shop lightweight trainers, daily mileage shoes, and carbon race options.</p>
                            <a href="/nike-air-zoom-pegasus-41">Featured Pegasus 41</a>
                        </main>
                    </body>
                </html>
            `),
        ],
        [
            "https://shop.example.com/nike-air-zoom-pegasus-41",
            htmlResponse(`
                <html>
                    <head>
                        <title>Nike Air Zoom Pegasus 41</title>
                        <meta name="description" content="A responsive daily trainer with Nike ReactX foam." />
                        <script type="application/ld+json">
                            {
                                "@context": "https://schema.org",
                                "@type": "Product",
                                "name": "Nike Air Zoom Pegasus 41",
                                "category": "Running Shoes",
                                "brand": {
                                    "@type": "Brand",
                                    "name": "Nike"
                                },
                                "offers": {
                                    "@type": "Offer",
                                    "priceCurrency": "USD",
                                    "price": "140"
                                }
                            }
                        </script>
                    </head>
                    <body>
                        <main>
                            <h1>Nike Air Zoom Pegasus 41</h1>
                            <p>Responsive cushioning for daily training miles.</p>
                        </main>
                    </body>
                </html>
            `),
        ],
        [
            "https://shop.example.com/brands/nike",
            htmlResponse(`
                <html>
                    <head>
                        <title>Nike Running Shoes</title>
                        <meta name="description" content="Shop Nike performance running shoes and training gear." />
                    </head>
                    <body>
                        <main>
                            <h1>Nike Running Shoes</h1>
                            <p>See our Nike catalog of daily trainers, tempo shoes, and race-day picks.</p>
                        </main>
                    </body>
                </html>
            `),
        ],
    ]);

    globalThis.fetch = (async (input: string | URL | Request) => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;

        return pageMap.get(url) || new Response("Not found", {
            status: 404,
            headers: {
                "content-type": "text/plain; charset=utf-8",
            },
        });
    }) as typeof fetch;

    try {
        const intelligence = await getAIBloggerWebsiteIntelligence("https://shop.example.com", {
            maxPages: 4,
            totalBudgetMs: 12_000,
            maxConcurrency: 1,
        });

        assert.ok(intelligence);
        assert.equal(intelligence.pageCount, 4);

        const productPage = intelligence.priorityPages.find((page) => page.path === "/nike-air-zoom-pegasus-41");
        const collectionPage = intelligence.priorityPages.find((page) => page.path === "/shop/running-shoes");
        const brandPage = intelligence.priorityPages.find((page) => page.path === "/brands/nike");

        assert.equal(productPage?.pageCategory, "product");
        assert.equal(collectionPage?.pageCategory, "collection");
        assert.equal(brandPage?.pageCategory, "brand");
        assert.ok(intelligence.serviceSignals.some((signal) => signal.toLowerCase().includes("nike air zoom pegasus 41")));
        assert.equal(intelligence.authorityProfile?.siteType, "ecommerce");
        assert.equal(intelligence.authorityProfile?.businessModel, "transactional-commerce");
        assert.ok(intelligence.authorityProfile?.authorityLanes.some((lane) => lane.toLowerCase().includes("running shoes")));
        assert.ok(intelligence.authorityProfile?.moneyPages.some((page) => page.path === "/nike-air-zoom-pegasus-41"));
    } finally {
        globalThis.fetch = originalFetch;
    }
});
