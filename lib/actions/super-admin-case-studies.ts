"use server";

import mongoose from "mongoose";
import { revalidatePath, updateTag } from "next/cache";

import dbConnect from "@/lib/marketing-db";
import {
    getBuiltInCaseStudies,
    hasCaseStudyPage,
    PORTFOLIO_SERVICES,
    type PortfolioCaseStudy,
    type PortfolioServiceId,
} from "@/lib/marketing-portfolio";
import { createDraftCaseStudy, tidyCaseStudy } from "@/lib/marketing-portfolio-editor";
import { PORTFOLIO_CACHE_TAG, PORTFOLIO_SETUP_KEY } from "@/lib/marketing-portfolio-store";
import { validateCaseStudy, type CaseStudyStatus } from "@/lib/marketing-portfolio-validation";
import MarketingSetting from "@/models/marketing/MarketingSetting";
import PortfolioCaseStudyModel from "@/models/marketing/PortfolioCaseStudy";

import { verifySuperAdmin } from "./super-admin-shared";

/**
 * Super Admin → Case Studies. Case studies live in the marketing database;
 * the first change copies the built-in ones there so nothing disappears from
 * the site. Every save is checked by validateCaseStudy, and publishing needs
 * a confirmation that the results are real and the client agreed.
 */

type StoredDoc = {
    _id: mongoose.Types.ObjectId;
    slug: string;
    status: CaseStudyStatus;
    order?: number;
    data?: Record<string, unknown>;
    publishConfirmation?: { confirmedAt?: Date; confirmedBy?: string };
    createdAt?: Date;
    updatedAt?: Date;
};

export type CaseStudyListItem = {
    id: string;
    slug: string;
    status: CaseStudyStatus;
    client: string;
    industry: string;
    services: PortfolioServiceId[];
    hasPage: boolean;
    problems: number;
    updatedAt: string | null;
};

export type CaseStudyList = {
    setUp: boolean;
    items: CaseStudyListItem[];
    /** The built-in case studies the site shows until case studies are set up here. */
    builtIn: Array<Pick<CaseStudyListItem, "slug" | "status" | "client" | "industry" | "services" | "hasPage">>;
    error?: string;
};

export type CaseStudyForEdit = {
    id: string;
    caseStudy: PortfolioCaseStudy;
    publishedBefore: boolean;
    confirmation: { confirmedAt: string | null; confirmedBy: string | null } | null;
    updatedAt: string | null;
};

export type CaseStudyActionResult<T extends object = object> =
    | ({ ok: true } & T)
    | { ok: false; errors: string[]; needsConfirmation?: boolean };

const SERVICE_IDS = new Set<string>(PORTFOLIO_SERVICES.map((service) => service.id));

function failure(error: unknown, fallback: string): { ok: false; errors: string[] } {
    console.error(`[CaseStudies] ${fallback}`, error);
    const message = error instanceof Error ? error.message : "";
    return { ok: false, errors: [message.startsWith("Unauthorized") ? message : fallback] };
}

function toIso(value?: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toCaseStudy(doc: Pick<StoredDoc, "slug" | "status" | "data">) {
    return { ...(doc.data || {}), slug: doc.slug, status: doc.status } as PortfolioCaseStudy;
}

function splitCaseStudy(study: PortfolioCaseStudy) {
    const { slug, status, ...data } = JSON.parse(JSON.stringify(study)) as PortfolioCaseStudy;
    return { slug, status, data };
}

function isObjectId(id: unknown): id is string {
    return typeof id === "string" && mongoose.isObjectIdOrHexString(id);
}

/** Clears the cached case studies and the pages that show them. */
function refreshPages(slugs: string[], services: string[]) {
    updateTag(PORTFOLIO_CACHE_TAG);
    revalidatePath("/portfolio");
    revalidatePath("/portfolio/preview");
    for (const slug of new Set(slugs)) {
        revalidatePath(`/portfolio/${slug}`);
        revalidatePath(`/portfolio/preview/${slug}`);
    }
    const hrefs = new Set(
        PORTFOLIO_SERVICES.filter((service) => services.includes(service.id) && service.href).map((service) => service.href as string),
    );
    for (const href of hrefs) {
        revalidatePath(href);
    }
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath("/llms-full.txt");
}

async function refreshAllPages() {
    const docs = (await PortfolioCaseStudyModel.find({}).select("slug").lean()) as unknown as Array<Pick<StoredDoc, "slug">>;
    refreshPages(
        docs.map((doc) => doc.slug),
        PORTFOLIO_SERVICES.map((service) => service.id),
    );
}

/**
 * Copies the built-in case studies into the database the first time anything
 * is changed, and records that this happened. Existing case studies with the
 * same address are left alone.
 */
async function ensureSetUp(userId: string) {
    const done = await MarketingSetting.exists({ key: PORTFOLIO_SETUP_KEY });
    if (done) return false;

    const builtIn = getBuiltInCaseStudies();
    await PortfolioCaseStudyModel.bulkWrite(
        builtIn.map((study, index) => {
            const { slug, status, data } = splitCaseStudy(study);
            return {
                updateOne: {
                    filter: { slug },
                    update: {
                        $setOnInsert: {
                            status,
                            order: (index + 1) * 10,
                            data,
                            ...(status === "published"
                                ? { publishConfirmation: { confirmedAt: new Date(), confirmedBy: "built-in" } }
                                : {}),
                        },
                    },
                    upsert: true,
                },
            };
        }),
        { ordered: false },
    );
    await MarketingSetting.updateOne(
        { key: PORTFOLIO_SETUP_KEY },
        { $setOnInsert: { value: { setUpAt: new Date(), setUpBy: userId } } },
        { upsert: true },
    );
    return true;
}

async function nextOrder() {
    const last = (await PortfolioCaseStudyModel.findOne({}).sort({ order: -1 }).select("order").lean()) as unknown as Pick<
        StoredDoc,
        "order"
    > | null;
    return (last?.order ?? 0) + 10;
}

async function freeSlug(base: string) {
    let slug = base;
    for (let attempt = 2; await PortfolioCaseStudyModel.exists({ slug }); attempt += 1) {
        slug = `${base}-${attempt}`;
    }
    return slug;
}

export async function listCaseStudies(): Promise<CaseStudyList> {
    await verifySuperAdmin();
    const builtIn = getBuiltInCaseStudies().map((study) => ({
        slug: study.slug,
        status: study.status,
        client: study.client,
        industry: study.industry,
        services: study.services,
        hasPage: hasCaseStudyPage(study),
    }));

    try {
        await dbConnect();
        const [docs, setUp] = await Promise.all([
            PortfolioCaseStudyModel.find({}).sort({ order: 1, createdAt: 1 }).lean() as unknown as Promise<StoredDoc[]>,
            MarketingSetting.exists({ key: PORTFOLIO_SETUP_KEY }),
        ]);

        const items = docs.map((doc) => {
            const study = toCaseStudy(doc);
            const check = validateCaseStudy(study);
            return {
                id: doc._id.toString(),
                slug: doc.slug,
                status: doc.status,
                client: typeof study.client === "string" && study.client ? study.client : doc.slug,
                industry: typeof study.industry === "string" ? study.industry : "",
                services: Array.isArray(study.services) ? study.services.filter((id) => SERVICE_IDS.has(id)) : [],
                hasPage: Boolean(study.story),
                problems: check.ok ? 0 : check.errors.length,
                updatedAt: toIso(doc.updatedAt),
            };
        });

        return { setUp: Boolean(setUp) || items.length > 0, items, builtIn };
    } catch (error) {
        console.error("[CaseStudies] Could not load case studies", error);
        return { setUp: false, items: [], builtIn, error: "Could not reach the database. Try again in a moment." };
    }
}

export async function getCaseStudyForEdit(id: string): Promise<CaseStudyForEdit | null> {
    await verifySuperAdmin();
    if (!isObjectId(id)) return null;

    await dbConnect();
    const doc = (await PortfolioCaseStudyModel.findById(id).lean()) as unknown as StoredDoc | null;
    if (!doc) return null;

    return JSON.parse(
        JSON.stringify({
            id: doc._id.toString(),
            caseStudy: toCaseStudy(doc),
            publishedBefore: doc.status === "published",
            confirmation: doc.publishConfirmation?.confirmedAt
                ? {
                      confirmedAt: toIso(doc.publishConfirmation.confirmedAt),
                      confirmedBy: doc.publishConfirmation.confirmedBy || null,
                  }
                : null,
            updatedAt: toIso(doc.updatedAt),
        }),
    ) as CaseStudyForEdit;
}

/** Copies the built-in case studies into the database so they can be edited. */
export async function setUpCaseStudies(): Promise<CaseStudyActionResult> {
    try {
        const session = await verifySuperAdmin();
        await dbConnect();
        await ensureSetUp(session.userId);
        await refreshAllPages();
        return { ok: true };
    } catch (error) {
        return failure(error, "Could not set up the case studies.");
    }
}

/** A new draft for a main service, prefilled from that service's example. */
export async function createCaseStudy(mainService: string): Promise<CaseStudyActionResult<{ id: string }>> {
    try {
        const session = await verifySuperAdmin();
        if (!SERVICE_IDS.has(mainService)) {
            return { ok: false, errors: ["Choose a service for the new case study."] };
        }

        await dbConnect();
        await ensureSetUp(session.userId);
        const draft = createDraftCaseStudy(mainService as PortfolioServiceId);
        const { data } = splitCaseStudy(draft);
        const slug = await freeSlug(`new-${mainService}-case-study`);
        const created = await PortfolioCaseStudyModel.create({ slug, status: "draft", order: await nextOrder(), data });

        refreshPages([slug], [mainService]);
        return { ok: true, id: created._id.toString() };
    } catch (error) {
        return failure(error, "Could not create the case study.");
    }
}

/** A draft copy of a case study, placed after it. */
export async function duplicateCaseStudy(id: string): Promise<CaseStudyActionResult<{ id: string }>> {
    try {
        await verifySuperAdmin();
        if (!isObjectId(id)) return { ok: false, errors: ["This case study no longer exists."] };

        await dbConnect();
        const doc = (await PortfolioCaseStudyModel.findById(id).lean()) as unknown as StoredDoc | null;
        if (!doc) return { ok: false, errors: ["This case study no longer exists."] };

        const base = doc.slug.replace(/^sample-/, "").replace(/-copy(?:-\d+)?$/, "");
        const slug = await freeSlug(`${base}-copy`);
        const data = { ...(doc.data || {}), featured: false };
        const created = await PortfolioCaseStudyModel.create({ slug, status: "draft", order: (doc.order ?? 0) + 1, data });

        refreshPages([slug], []);
        return { ok: true, id: created._id.toString() };
    } catch (error) {
        return failure(error, "Could not copy the case study.");
    }
}

export async function saveCaseStudy(input: {
    id: string;
    caseStudy: unknown;
    confirmPublish?: boolean;
}): Promise<CaseStudyActionResult<{ slug: string; status: CaseStudyStatus; updatedAt: string | null }>> {
    try {
        const session = await verifySuperAdmin();
        if (!isObjectId(input?.id)) return { ok: false, errors: ["This case study no longer exists."] };

        const check = validateCaseStudy(tidyCaseStudy(JSON.parse(JSON.stringify(input.caseStudy ?? null))));
        if (!check.ok) return { ok: false, errors: check.errors };
        const study = check.value;

        await dbConnect();
        const existing = (await PortfolioCaseStudyModel.findById(input.id)
            .select("slug status data publishConfirmation")
            .lean()) as unknown as StoredDoc | null;
        if (!existing) return { ok: false, errors: ["This case study no longer exists."] };

        if (await PortfolioCaseStudyModel.exists({ slug: study.slug, _id: { $ne: existing._id } })) {
            return { ok: false, errors: [`slug: another case study already uses /portfolio/${study.slug}`] };
        }

        const publishing = study.status === "published" && existing.status !== "published";
        if (publishing && input.confirmPublish !== true) {
            return {
                ok: false,
                needsConfirmation: true,
                errors: ["Confirm that the results are real and the client agreed before publishing."],
            };
        }

        const { slug, status, data } = splitCaseStudy(study);
        const update: Record<string, unknown> = { $set: { slug, status, data } };
        if (status !== "published") {
            update.$unset = { publishConfirmation: "" };
        } else if (publishing || !existing.publishConfirmation?.confirmedAt) {
            (update.$set as Record<string, unknown>).publishConfirmation = {
                confirmedAt: new Date(),
                confirmedBy: session.userId,
            };
        }

        const saved = (await PortfolioCaseStudyModel.findByIdAndUpdate(existing._id, update, {
            returnDocument: "after",
            runValidators: true,
        })
            .select("updatedAt")
            .lean()) as unknown as Pick<StoredDoc, "updatedAt"> | null;

        const previousServices = Array.isArray(existing.data?.services) ? (existing.data.services as string[]) : [];
        refreshPages([existing.slug, slug], [...previousServices, ...study.services]);
        return { ok: true, slug, status, updatedAt: toIso(saved?.updatedAt) };
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
            return { ok: false, errors: ["slug: another case study already uses this address"] };
        }
        return failure(error, "Could not save the case study.");
    }
}

export async function deleteCaseStudy(id: string): Promise<CaseStudyActionResult> {
    try {
        await verifySuperAdmin();
        if (!isObjectId(id)) return { ok: false, errors: ["This case study no longer exists."] };

        await dbConnect();
        const doc = (await PortfolioCaseStudyModel.findByIdAndDelete(id).select("slug data").lean()) as unknown as StoredDoc | null;
        if (doc) {
            const services = Array.isArray(doc.data?.services) ? (doc.data.services as string[]) : [];
            refreshPages([doc.slug], services);
        }
        return { ok: true };
    } catch (error) {
        return failure(error, "Could not delete the case study.");
    }
}

/** Saves the order case studies appear in, given every id from first to last. */
export async function reorderCaseStudies(ids: string[]): Promise<CaseStudyActionResult> {
    try {
        await verifySuperAdmin();
        if (!Array.isArray(ids) || !ids.every(isObjectId)) {
            return { ok: false, errors: ["Could not read the new order."] };
        }

        await dbConnect();
        await PortfolioCaseStudyModel.bulkWrite(
            ids.map((id, index) => ({
                updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set: { order: (index + 1) * 10 } } },
            })),
            { ordered: false },
        );
        await refreshAllPages();
        return { ok: true };
    } catch (error) {
        return failure(error, "Could not save the new order.");
    }
}

/** Adds back any built-in example (sample) case studies that were deleted. */
export async function restoreExampleCaseStudies(): Promise<CaseStudyActionResult<{ added: number }>> {
    try {
        const session = await verifySuperAdmin();
        await dbConnect();
        await ensureSetUp(session.userId);

        const samples = getBuiltInCaseStudies().filter((study) => study.status === "sample");
        let order = await nextOrder();
        const result = await PortfolioCaseStudyModel.bulkWrite(
            samples.map((study) => {
                const { slug, status, data } = splitCaseStudy(study);
                order += 10;
                return {
                    updateOne: {
                        filter: { slug },
                        update: { $setOnInsert: { status, order, data } },
                        upsert: true,
                    },
                };
            }),
            { ordered: false },
        );

        await refreshAllPages();
        return { ok: true, added: result.upsertedCount ?? 0 };
    } catch (error) {
        return failure(error, "Could not restore the examples.");
    }
}
