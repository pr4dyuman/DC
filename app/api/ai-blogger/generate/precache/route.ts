import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
import { getAIBloggerWebsiteIntelligence } from "@/lib/ai-blogger-website-intelligence";

export const dynamic = "force-dynamic";
/**
 * This function has its own dedicated 300-second Vercel budget only for
 * website crawling. It runs in parallel with the main worker so the worker's
 * AI budget is never consumed waiting for a sitemap/page fetch.
 */
export const maxDuration = 300;

type PrecacheRequestBody = {
    jobId: string;
    agencyId: string;
    sourceUrl: string;
    crawlConfig?: {
        enabled?: boolean;
        maxPages?: number;
        timeoutMs?: number;
        refreshWindowHours?: number;
        allowedPaths?: string[];
        blockedPaths?: string[];
    };
};

function isPrecacheBody(value: unknown): value is PrecacheRequestBody {
    if (!value || typeof value !== "object") return false;
    const b = value as Record<string, unknown>;
    return (
        typeof b.jobId === "string" &&
        typeof b.agencyId === "string" &&
        typeof b.sourceUrl === "string"
    );
}

/**
 * POST /api/ai-blogger/generate/precache
 *
 * Internal endpoint called by the /generate route in parallel with the
 * /generate/worker. Crawls the website and stores results in MongoDB so
 * the worker can retrieve via cache polling instead of crawling itself.
 * Protected by the same worker secret.
 */
export async function POST(request: Request) {
    const workerSecret = process.env.AI_BLOGGER_WORKER_SECRET;
    if (!workerSecret) {
        return NextResponse.json({ ok: false, error: "Not configured." }, { status: 500 });
    }
    if (request.headers.get("x-worker-secret") !== workerSecret) {
        return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
    }

    if (!isPrecacheBody(body)) {
        return NextResponse.json({ ok: false, error: "Invalid body shape." }, { status: 400 });
    }

    const { jobId, agencyId, sourceUrl, crawlConfig } = body;
    console.log(`[PRECACHE] Starting website crawl for job ${jobId}: ${sourceUrl}`);

    try {
        // Ensure MongoDB is connected before crawling so the cache write succeeds.
        await connectDB();

        const intel = await getAIBloggerWebsiteIntelligence(sourceUrl, {
            agencyId,
            enabled: crawlConfig?.enabled ?? true,
            maxPages: crawlConfig?.maxPages,
            // Give each page fetch a generous timeout - we have 300s total.
            timeoutMs: Math.min(crawlConfig?.timeoutMs ?? 12000, 20000),
            refreshWindowHours: crawlConfig?.refreshWindowHours,
            allowedPaths: crawlConfig?.allowedPaths,
            blockedPaths: crawlConfig?.blockedPaths,
            totalBudgetMs: 55_000,
            maxConcurrency: 3,
            // Always do a fresh crawl - the precache's job is to write a new snapshot
            // for the worker to pick up. If we return a cached hit here, the worker
            // also gets that same stale cache and never recrawls.
            forceRefresh: true,
        });

        if (intel) {
            console.log(`[PRECACHE] Crawl complete for job ${jobId}: ${intel.pageCount} pages (${intel.cacheStatus})`);
            // Do not emit SSE events here. The worker owns pipeline SSE events.
        } else {
            console.warn(`[PRECACHE] Crawl returned no data for job ${jobId}: ${sourceUrl}`);
        }

        return NextResponse.json({ ok: true, pages: intel?.pageCount ?? 0 });
    } catch (error) {
        if (isMongoConnectionIssue(error)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Website precache could not start because MongoDB is temporarily unavailable.",
                },
                { status: 503 },
            );
        }

        const message = error instanceof Error ? error.message : "Unknown crawl error";
        console.error(`[PRECACHE] Crawl failed for job ${jobId}:`, message);
        // Non-fatal - the worker will fall back to its own crawl attempt.
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
