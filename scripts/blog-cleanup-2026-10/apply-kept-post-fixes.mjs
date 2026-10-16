#!/usr/bin/env node
/**
 * One-off: apply the reviewed text fixes in kept-post-fixes.json to the kept blog posts.
 *
 * Each edit is an exact find -> replace. It is applied to every stored text field
 * of the post: content, FAQ questions and answers, the People Also Ask list and
 * the stored JSON-LD. An edit that matches nowhere is reported and skipped, so
 * nothing is changed by guesswork; do those by hand in the super-admin editor.
 * Before writing it saves a JSON backup of every post it changes.
 *
 * Usage (from the repository root, with the production database variables):
 *   node --env-file=.env.local scripts/blog-cleanup-2026-10/apply-kept-post-fixes.mjs          # dry run
 *   node --env-file=.env.local scripts/blog-cleanup-2026-10/apply-kept-post-fixes.mjs --apply  # write
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const here = dirname(fileURLToPath(import.meta.url));
const fixes = JSON.parse(readFileSync(join(here, "kept-post-fixes.json"), "utf8"));
const APPLY = process.argv.includes("--apply");
const MARKETING_DB_URI = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;
if (!MARKETING_DB_URI) {
    console.error("Set MONGODB_URI (or MARKETING_DB_URI), e.g. with --env-file=.env.local");
    process.exit(1);
}

const htmlEscape = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const jsonEscape = (value) => JSON.stringify(value).slice(1, -1);

// Spellings a find string can have in the stored field, paired with the matching replacement.
function variants(find, replace, field) {
    if (field === "schemaMarkup") {
        return [[jsonEscape(find), jsonEscape(replace)], [jsonEscape(htmlEscape(find)), jsonEscape(htmlEscape(replace))]];
    }
    const pairs = [[find, replace], [htmlEscape(find), htmlEscape(replace)], [find.replace(/'/g, "&#x27;"), replace.replace(/'/g, "&#x27;")]];
    return pairs.filter((pair, index) => pairs.findIndex((other) => other[0] === pair[0]) === index);
}

function applyEdit(text, edit, field) {
    for (const [find, replace] of variants(edit.find, edit.replace, field)) {
        if (find && text.includes(find)) {
            return { text: text.split(find).join(replace), count: text.split(find).length - 1 };
        }
    }
    return { text, count: 0 };
}

const client = new MongoClient(MARKETING_DB_URI);
try {
    await client.connect();
    const blogs = client.db("marketing-blog").collection("blogs");
    const backups = [];
    const backupFile = join(here, "backups", `kept-posts-before-fixes-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    let applied = 0;
    let skipped = 0;

    for (const post of fixes.posts) {
        const doc = await blogs.findOne({ slug: post.slug });
        if (!doc) {
            console.log(`\n${post.slug}: NOT FOUND`);
            continue;
        }

        const next = {
            content: doc.content || "",
            schemaMarkup: doc.schemaMarkup || "",
            peopleAlsoAsk: [...(doc.peopleAlsoAsk || [])],
            faqItems: (doc.faqItems || []).map((item) => ({ ...item })),
        };
        console.log(`\n${post.slug}`);

        for (const edit of post.edits) {
            const hits = [];
            let result = applyEdit(next.content, edit, "content");
            next.content = result.text;
            if (result.count) hits.push(`content x${result.count}`);
            result = applyEdit(next.schemaMarkup, edit, "schemaMarkup");
            next.schemaMarkup = result.text;
            if (result.count) hits.push(`schema x${result.count}`);
            next.peopleAlsoAsk = next.peopleAlsoAsk.map((question) => {
                const r = applyEdit(question, edit, "text");
                if (r.count) hits.push("people-also-ask");
                return r.text;
            });
            next.faqItems = next.faqItems.map((item) => {
                const q = applyEdit(item.question || "", edit, "text");
                const a = applyEdit(item.answer || "", edit, "text");
                if (q.count) hits.push("faq question");
                if (a.count) hits.push("faq answer");
                return { ...item, question: q.text, answer: a.text };
            });

            if (hits.length) {
                applied += 1;
                console.log(`  ok    ${edit.find.slice(0, 70)} -> [${hits.join(", ")}]`);
            } else {
                skipped += 1;
                console.log(`  SKIP  not found, do by hand: ${edit.find.slice(0, 90)}`);
            }
        }

        const set = {};
        if (next.content !== (doc.content || "")) set.content = next.content;
        if (next.schemaMarkup !== (doc.schemaMarkup || "")) set.schemaMarkup = next.schemaMarkup;
        if (JSON.stringify(next.peopleAlsoAsk) !== JSON.stringify(doc.peopleAlsoAsk || [])) set.peopleAlsoAsk = next.peopleAlsoAsk;
        if (JSON.stringify(next.faqItems) !== JSON.stringify(doc.faqItems || [])) set.faqItems = next.faqItems;
        if (post.metaTitle) set.metaTitle = post.metaTitle;
        if (post.metaDescription) set.metaDescription = post.metaDescription;

        if (Object.keys(set).length && APPLY) {
            backups.push(doc);
            mkdirSync(dirname(backupFile), { recursive: true });
            writeFileSync(backupFile, JSON.stringify(backups, null, 1));
            await blogs.updateOne({ _id: doc._id }, { $set: { ...set, updatedAt: new Date() } });
            console.log(`  saved: ${Object.keys(set).join(", ")}`);
        } else if (Object.keys(set).length) {
            console.log(`  would save: ${Object.keys(set).join(", ")}`);
        }
    }

    if (APPLY && backups.length) {
        console.log(`\nBackup of the original posts: ${backupFile}`);
    }
    console.log(`\nEdits matched: ${applied}, not found (do by hand): ${skipped}${APPLY ? "" : "\nDry run only. Re-run with --apply to save."}`);
} finally {
    await client.close();
}
