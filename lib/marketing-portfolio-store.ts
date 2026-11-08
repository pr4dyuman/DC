import { unstable_cache } from "next/cache";

import dbConnect from "@/lib/marketing-db";
import {
    filterServiceCaseStudies,
    getBuiltInCaseStudies,
    selectCaseStudies,
    type PortfolioCaseStudy,
    type PortfolioServiceId,
} from "@/lib/marketing-portfolio";
import { validateCaseStudy } from "@/lib/marketing-portfolio-validation";
import MarketingSetting from "@/models/marketing/MarketingSetting";
import PortfolioCaseStudyModel from "@/models/marketing/PortfolioCaseStudy";

/**
 * Where the site's case studies come from. Super Admin → Case Studies saves
 * them in the marketing database; pages read them through a cache that each
 * save clears (PORTFOLIO_CACHE_TAG). Until case studies are set up there, or
 * whenever the database cannot be reached, the case studies built into the
 * code are used instead, so the portfolio never breaks.
 */

export const PORTFOLIO_CACHE_TAG = "portfolio-case-studies";

/** Marks that the case studies were set up in Super Admin; from then on the database alone decides what shows. */
export const PORTFOLIO_SETUP_KEY = "portfolio.case-studies.set-up";

const DATABASE_DEADLINE_MS = 5000;

type StoredCaseStudy = { slug: string; status: string; data: unknown };

function withDeadline<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timed out")), DATABASE_DEADLINE_MS);
    });
    return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/** A stored case study as the site draws it, or null when its data no longer passes the checks. */
export function storedToCaseStudy(doc: StoredCaseStudy): PortfolioCaseStudy | null {
    const data = doc.data && typeof doc.data === "object" ? doc.data : {};
    const result = validateCaseStudy({ ...data, slug: doc.slug, status: doc.status });
    if (!result.ok) {
        console.error(`[Portfolio] Skipping case study "${doc.slug}": ${result.errors.slice(0, 3).join("; ")}`);
        return null;
    }
    return result.value;
}

async function readStoredCaseStudies(): Promise<PortfolioCaseStudy[] | null> {
    if (!process.env.MARKETING_DB_URI && !process.env.MONGODB_URI) {
        return null;
    }

    try {
        await withDeadline(dbConnect());
        const [docs, setUp] = (await withDeadline(
            Promise.all([
                PortfolioCaseStudyModel.find({}).sort({ order: 1, createdAt: 1 }).select("slug status data").lean(),
                MarketingSetting.exists({ key: PORTFOLIO_SETUP_KEY }),
            ]),
        )) as unknown as [StoredCaseStudy[], unknown];
        if (!docs.length && !setUp) {
            return null;
        }
        return docs.map(storedToCaseStudy).filter((study): study is PortfolioCaseStudy => Boolean(study));
    } catch (error) {
        console.error(
            "[Portfolio] Could not read case studies from the database; using the built-in ones.",
            error instanceof Error ? error.message : error,
        );
        return null;
    }
}

const readCachedCaseStudies = unstable_cache(readStoredCaseStudies, ["portfolio-case-studies-v1"], {
    tags: [PORTFOLIO_CACHE_TAG],
    revalidate: 600,
});

/** Every case study, in display order: stored ones, or the built-in ones. */
export async function loadAllCaseStudies(): Promise<PortfolioCaseStudy[]> {
    return (await readCachedCaseStudies()) ?? getBuiltInCaseStudies();
}

export async function loadCaseStudies({ includeSamples = false } = {}) {
    return selectCaseStudies(await loadAllCaseStudies(), { includeSamples });
}

export async function loadCaseStudy(slug: string | null | undefined, { includeSamples = false } = {}) {
    return (await loadCaseStudies({ includeSamples })).find((study) => study.slug === slug) ?? null;
}

export async function loadServiceCaseStudies(serviceIds: PortfolioServiceId[]) {
    return filterServiceCaseStudies(await loadAllCaseStudies(), serviceIds);
}
