#!/usr/bin/env node
/**
 * One-off: delete the blog posts listed in lib/marketing-blog-removed-posts.json.
 *
 * Mirrors bulkDeleteBlogs() in lib/actions/super-admin-blog-management.ts:
 *   - deletes the marketing blog documents,
 *   - removes internalLinks entries that point at them from every other post,
 *   - rewrites inline links in other posts: links to redirected posts now point
 *     at the redirect target, links to "gone" posts are unlinked (text kept),
 *   - marks the matching AI Blogger posts as no longer published, so the
 *     studio does not treat them as live.
 * Before deleting it writes a JSON backup of every affected document.
 *
 * Usage (from the repository root, with the production database variables):
 *   node --env-file=.env.local scripts/blog-cleanup-2026-10/delete-removed-posts.mjs          # dry run
 *   node --env-file=.env.local scripts/blog-cleanup-2026-10/delete-removed-posts.mjs --apply  # write
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";

const here = dirname(fileURLToPath(import.meta.url));
const removed = JSON.parse(readFileSync(join(here, "../../lib/marketing-blog-removed-posts.json"), "utf8"));
const APPLY = process.argv.includes("--apply");

const MARKETING_DB_URI = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;
const PRIMARY_DB_URI = process.env.MONGODB_URI;
if (!MARKETING_DB_URI || !PRIMARY_DB_URI) {
    console.error("Set MONGODB_URI (and MARKETING_DB_URI if the blog uses its own cluster), e.g. with --env-file=.env.local");
    process.exit(1);
}

const redirects = removed.redirects;
const goneSlugs = removed.gone;
const removedSlugs = [...Object.keys(redirects), ...goneSlugs];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hrefCandidates(slug) {
    const path = `/blog/${slug}`;
    const bases = [path, `https://digitalcorvids.com${path}`, `https://www.digitalcorvids.com${path}`];
    return bases.flatMap((base) => [base, `${base}/`]);
}

// Rewrites (or unlinks, when target is null) markdown and HTML links to one removed post.
function rewriteLinks(content, slug, target) {
    let next = content;
    for (const candidate of hrefCandidates(slug).sort((a, b) => b.length - a.length)) {
        const href = escapeRegex(candidate);
        const markdown = new RegExp(`\\[([^\\]]+)\\]\\(\\s*${href}\\s*(?:"[^"]*")?\\)`, "gi");
        const html = new RegExp(`<a\\b(?=[^>]*\\bhref\\s*=\\s*["']${href}["'])[^>]*>([\\s\\S]*?)<\\/a>`, "gi");
        next = target
            ? next.replace(markdown, `[$1](${target})`).replace(html, `<a href="${target}">$1</a>`)
            : next.replace(markdown, "$1").replace(html, "$1");
    }
    return next;
}

const marketingClient = new MongoClient(MARKETING_DB_URI);
const primaryClient = PRIMARY_DB_URI === MARKETING_DB_URI ? marketingClient : new MongoClient(PRIMARY_DB_URI);

try {
    await marketingClient.connect();
    if (primaryClient !== marketingClient) await primaryClient.connect();

    const blogs = marketingClient.db("marketing-blog").collection("blogs");
    const studioPosts = primaryClient.db().collection("blogstudioposts");

    const toDelete = await blogs.find({ slug: { $in: removedSlugs } }).toArray();
    const foundSlugs = new Set(toDelete.map((doc) => doc.slug));
    const missing = removedSlugs.filter((slug) => !foundSlugs.has(slug));

    console.log(`Posts to delete: ${toDelete.length} of ${removedSlugs.length} listed`);
    for (const doc of toDelete) {
        const action = redirects[doc.slug] ? `301 -> ${redirects[doc.slug]}` : "404";
        console.log(`  - ${doc.slug} [${doc.status}] ${action}`);
    }
    if (missing.length) console.log(`Not in the database (already deleted?): ${missing.join(", ")}`);

    const allCandidates = removedSlugs.flatMap(hrefCandidates);
    const remaining = await blogs.find({ slug: { $nin: removedSlugs } }).project({ slug: 1, content: 1, internalLinks: 1 }).toArray();
    const contentUpdates = [];
    for (const doc of remaining) {
        const before = typeof doc.content === "string" ? doc.content : "";
        let after = before;
        for (const slug of removedSlugs) after = rewriteLinks(after, slug, redirects[slug] || null);
        const linkEntries = (doc.internalLinks || []).filter(
            (link) => allCandidates.includes(link?.href) || removedSlugs.includes(link?.targetPostSlug),
        ).length;
        if (after !== before || linkEntries > 0) {
            contentUpdates.push({ _id: doc._id, slug: doc.slug, after, contentChanged: after !== before, linkEntries });
        }
    }
    console.log(`Other posts whose links change: ${contentUpdates.length}`);
    for (const update of contentUpdates) {
        console.log(`  - ${update.slug}: inline links ${update.contentChanged ? "rewritten" : "unchanged"}, internalLinks entries removed: ${update.linkEntries}`);
    }

    if (!APPLY) {
        console.log("\nDry run only. Re-run with --apply to delete.");
    } else {
        const backupDir = join(here, "backups");
        mkdirSync(backupDir, { recursive: true });
        const backupFile = join(backupDir, `removed-posts-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        const changedBefore = await blogs.find({ _id: { $in: contentUpdates.map((u) => u._id) } }).toArray();
        writeFileSync(backupFile, JSON.stringify({ deleted: toDelete, changedBefore }, null, 1));
        console.log(`\nBackup written: ${backupFile}`);

        const deleted = await blogs.deleteMany({ _id: { $in: toDelete.map((doc) => doc._id) } });
        await blogs.updateMany({}, { $pull: { internalLinks: { href: { $in: allCandidates } } } });
        await blogs.updateMany({}, { $pull: { internalLinks: { targetPostSlug: { $in: removedSlugs } } } });
        for (const update of contentUpdates.filter((u) => u.contentChanged)) {
            await blogs.updateOne({ _id: update._id }, { $set: { content: update.after, updatedAt: new Date() } });
        }

        const sourceIds = toDelete.map((doc) => doc.sourcePostId).filter((id) => typeof id === "string" && id.trim());
        const studioFilter = {
            $or: [
                { id: { $in: sourceIds } },
                { _id: { $in: sourceIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } },
                { publishedEntrySlug: { $in: removedSlugs } },
                { publishedEntryId: { $in: toDelete.map((doc) => doc._id.toString()) } },
            ],
        };
        const studio = await studioPosts.updateMany(studioFilter, {
            $set: {
                status: "SEO Review",
                deliveryStatus: "failed",
                deliveryError: "Public marketing blog was deleted in the 2026-10 blog cleanup.",
                updatedAt: new Date().toISOString(),
                updatedBy: "blog-cleanup-2026-10",
            },
            $unset: { publishedEntryId: 1, publishedEntrySlug: 1, publishedTargetUrl: 1, publishedAt: 1, publishedMetadataValidatedAt: 1 },
        });

        console.log(`Deleted ${deleted.deletedCount} posts; AI Blogger posts updated: ${studio.modifiedCount}`);
        console.log("Pages are rendered per request; the /blog list refreshes within 60 seconds.");
    }
} finally {
    await marketingClient.close();
    if (primaryClient !== marketingClient) await primaryClient.close();
}
