#!/usr/bin/env node
/**
 * One-off: apply the blog fixes from the November search data review
 * (doc/search-data-review-2026-11.md) listed in review-fixes.json.
 *
 * - `set` changes a field (metaTitle, metaDescription) only while it still holds
 *   the expected old text, so later edits made in the editor are never overwritten.
 * - Each group of `edits` changes the post's content only if every find in the
 *   group matches exactly once; otherwise the whole group is skipped and reported.
 * Nothing is changed by guesswork: anything skipped is left for the editor.
 * Before writing, it saves a JSON backup of every post it is about to change.
 *
 * Usage (from the repository root, with the production database variables):
 *   node --env-file=.env.local scripts/blog-fixes-2026-11/apply-review-fixes.mjs          # dry run
 *   node --env-file=.env.local scripts/blog-fixes-2026-11/apply-review-fixes.mjs --apply  # write
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const here = dirname(fileURLToPath(import.meta.url));
const fixes = JSON.parse(readFileSync(join(here, "review-fixes.json"), "utf8"));
const APPLY = process.argv.includes("--apply");
const MARKETING_DB_URI = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;
if (!MARKETING_DB_URI) {
    console.error("Set MONGODB_URI (or MARKETING_DB_URI), e.g. with --env-file=.env.local");
    process.exit(1);
}

const htmlEscape = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Spellings a find string can have in the stored HTML, paired with the matching replacement.
function variants(find, replace) {
    const pairs = [
        [find, replace],
        [htmlEscape(find), htmlEscape(replace)],
        [find.replace(/'/g, "&#x27;"), replace.replace(/'/g, "&#x27;")],
    ];
    return pairs.filter((pair, index) => pairs.findIndex((other) => other[0] === pair[0]) === index);
}

const occurrences = (text, find) => text.split(find).length - 1;

// The stored spelling of an edit that occurs exactly once, or a reason it can't be used.
function locate(text, edit) {
    for (const [find, replace] of variants(edit.find, edit.replace)) {
        const count = occurrences(text, find);
        if (count === 1) return { find, replace };
        if (count > 1) return { problem: `"${edit.find}" appears ${count} times` };
    }
    return { problem: `"${edit.find}" not found` };
}

function alreadyApplied(text, group) {
    return group.every((edit) => variants(edit.replace, edit.replace).some(([replace]) => text.includes(replace)));
}

const client = new MongoClient(MARKETING_DB_URI);
try {
    await client.connect();
    const blogs = client.db("marketing-blog").collection("blogs");
    const planned = [];
    let skipped = 0;

    for (const post of fixes.posts) {
        const doc = await blogs.findOne({ slug: post.slug });
        console.log(`\n${post.slug}`);
        if (!doc) {
            console.log("  NOT FOUND");
            skipped += 1;
            continue;
        }

        const update = {};
        for (const [field, { from, to }] of Object.entries(post.set || {})) {
            const current = typeof doc[field] === "string" ? doc[field].trim() : "";
            if (current === to) {
                console.log(`  ${field}: already done`);
            } else if (current !== from) {
                console.log(`  SKIP ${field}: it now reads "${current}"`);
                skipped += 1;
            } else {
                console.log(`  ${field}:\n    "${from}"\n -> "${to}"`);
                update[field] = to;
            }
        }

        let content = typeof doc.content === "string" ? doc.content : "";
        for (const edit of post.edits || []) {
            if (alreadyApplied(content, edit.group)) {
                console.log(`  content, ${edit.why}: already done`);
                continue;
            }
            const located = edit.group.map((item) => locate(content, item));
            const problem = located.find((item) => item.problem);
            if (problem) {
                console.log(`  SKIP content, ${edit.why}: ${problem.problem}. Change it in the editor.`);
                skipped += 1;
                continue;
            }
            for (const { find, replace } of located) {
                content = content.replace(find, replace);
            }
            console.log(`  content, ${edit.why}: ok`);
        }
        if (content !== (doc.content || "")) {
            update.content = content;
        }

        if (Object.keys(update).length > 0) {
            if ("updatedAt" in doc) update.updatedAt = new Date();
            planned.push({ doc, update });
        }
    }

    if (!APPLY) {
        console.log(`\nDry run: ${planned.length} post(s) would change, ${skipped} item(s) skipped. Run again with --apply to write.`);
    } else if (planned.length > 0) {
        const backupDir = join(here, "backups");
        mkdirSync(backupDir, { recursive: true });
        const backupFile = join(backupDir, `posts-before-review-fixes-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        writeFileSync(backupFile, JSON.stringify(planned.map(({ doc }) => doc), null, 2));
        console.log(`\nBackup saved: ${backupFile}`);
        for (const { doc, update } of planned) {
            await blogs.updateOne({ _id: doc._id }, { $set: update });
        }
        console.log(`Changed ${planned.length} post(s), ${skipped} item(s) skipped. Pages update within a few minutes.`);
    } else {
        console.log(`\nNothing to change, ${skipped} item(s) skipped.`);
    }
} finally {
    await client.close();
}
