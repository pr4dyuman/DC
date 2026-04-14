#!/usr/bin/env node

import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();

dotenv.config({ path: path.join(cwd, ".env"), quiet: true });
dotenv.config({ path: path.join(cwd, ".env.local"), override: true, quiet: true });

const DEFAULT_PRIMARY_COLLECTION = "blogstudioposts";
const DEFAULT_MARKETING_COLLECTION = "blogs";
const DEFAULT_MARKETING_DB_NAME = "marketing-blog";

function parseArgs(argv) {
  const args = {
    apply: false,
    yes: false,
    ensureIndexes: true,
    includeNormalized: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--yes") {
      args.yes = true;
    } else if (arg === "--no-indexes") {
      args.ensureIndexes = false;
    } else if (arg === "--exact-only") {
      args.includeNormalized = false;
    } else if (arg.startsWith("--primary-db=")) {
      args.primaryDbName = arg.slice("--primary-db=".length);
    } else if (arg === "--primary-db") {
      args.primaryDbName = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--marketing-db=")) {
      args.marketingDbName = arg.slice("--marketing-db=".length);
    } else if (arg === "--marketing-db") {
      args.marketingDbName = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/clean-canonical-url-duplicates.mjs [--apply --yes] [--no-indexes] [--exact-only]

Default mode is dry-run. It writes an audit file and performs no DB writes.

Options:
  --apply          Unset duplicate/blank canonicalUrl fields.
  --yes            Required with --apply.
  --no-indexes     Do not create/verify unique canonicalUrl indexes after cleanup.
  --exact-only     Only group exact duplicate canonicalUrl values, not normalized URL matches.
  --primary-db     Override primary Mongo database name. Defaults to URI database.
  --marketing-db   Override marketing Mongo database name. Defaults to marketing-blog.
`);
}

function redactMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "") || "(default)";
    return `${parsed.protocol}//${parsed.host}/${dbName}`;
  } catch {
    return "(invalid URI)";
  }
}

function resolveDb(client, explicitName) {
  return explicitName ? client.db(explicitName) : client.db();
}

function normalizeCanonicalKey(value, includeNormalized) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }

  if (!includeNormalized) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const port =
      parsed.port &&
      !((protocol === "https:" && parsed.port === "443") || (protocol === "http:" && parsed.port === "80"))
        ? `:${parsed.port}`
        : "";
    const pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    return `${protocol}//${hostname}${port}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function objectIdToString(value) {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return String(value);
}

function dateScore(value) {
  if (!value) {
    return 0;
  }

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function canonicalSlugMatches(doc, canonicalKey) {
  const slugs = [doc.publishedEntrySlug, doc.slug]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase());

  if (slugs.length === 0 || !canonicalKey) {
    return false;
  }

  try {
    const parsed = new URL(canonicalKey);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = (segments[segments.length - 1] || "").toLowerCase();
    return slugs.some((slug) => lastSegment === slug);
  } catch {
    return slugs.some((slug) => canonicalKey.toLowerCase().endsWith(`/${slug}`));
  }
}

function scoreAiBloggerPost(doc, canonicalKey) {
  const statusScore = {
    Published: 700,
    Scheduled: 600,
    Approved: 500,
    "SEO Review": 400,
    Research: 300,
    Draft: 200,
  }[doc.status] || 0;

  return {
    score:
      statusScore +
      (canonicalSlugMatches(doc, canonicalKey) ? 100 : 0) +
      (doc.publishedAt ? 50 : 0) +
      Math.min(dateScore(doc.updatedAt || doc.createdAt) / 1000000000000, 10),
    updatedAt: dateScore(doc.updatedAt || doc.createdAt),
    id: objectIdToString(doc._id),
  };
}

function scoreMarketingBlog(doc, canonicalKey) {
  return {
    score:
      (doc.status === "published" ? 700 : 300) +
      (canonicalSlugMatches(doc, canonicalKey) ? 100 : 0) +
      (doc.sourcePostId ? 50 : 0) +
      (doc.publishedAt ? 25 : 0) +
      Math.min(dateScore(doc.updatedAt || doc.createdAt) / 1000000000000, 10),
    updatedAt: dateScore(doc.updatedAt || doc.createdAt),
    id: objectIdToString(doc._id),
  };
}

function chooseKeeper(docs, canonicalKey, scorer) {
  return [...docs].sort((left, right) => {
    const leftScore = scorer(left, canonicalKey);
    const rightScore = scorer(right, canonicalKey);

    if (rightScore.score !== leftScore.score) {
      return rightScore.score - leftScore.score;
    }

    if (rightScore.updatedAt !== leftScore.updatedAt) {
      return rightScore.updatedAt - leftScore.updatedAt;
    }

    return leftScore.id.localeCompare(rightScore.id);
  })[0];
}

function summarizeDoc(doc) {
  return {
    _id: objectIdToString(doc._id),
    id: doc.id,
    agencyId: doc.agencyId,
    sourcePostId: doc.sourcePostId,
    slug: doc.slug,
    publishedEntrySlug: doc.publishedEntrySlug,
    title: doc.title,
    status: doc.status,
    canonicalUrl: doc.canonicalUrl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
  };
}

async function collectPlans({ collection, kind, scopeField, scorer, includeNormalized }) {
  const projection = {
    id: 1,
    agencyId: 1,
    sourcePostId: 1,
    slug: 1,
    publishedEntrySlug: 1,
    title: 1,
    status: 1,
    canonicalUrl: 1,
    createdAt: 1,
    updatedAt: 1,
    publishedAt: 1,
  };

  const docs = await collection
    .find(
      {
        canonicalUrl: {
          $exists: true,
          $type: "string",
        },
      },
      { projection },
    )
    .toArray();

  const blankDocs = [];
  const groups = new Map();

  for (const doc of docs) {
    const rawCanonical = typeof doc.canonicalUrl === "string" ? doc.canonicalUrl.trim() : "";
    if (!rawCanonical) {
      blankDocs.push(doc);
      continue;
    }

    const canonicalKey = normalizeCanonicalKey(rawCanonical, includeNormalized);
    const scope = scopeField ? doc[scopeField] || "(missing)" : "global";
    const groupKey = `${scope}::${canonicalKey}`;
    const existing = groups.get(groupKey) || {
      scope,
      canonicalKey,
      docs: [],
    };
    existing.docs.push(doc);
    groups.set(groupKey, existing);
  }

  const duplicateGroups = [];
  const changes = [];

  for (const group of groups.values()) {
    if (group.docs.length < 2) {
      continue;
    }

    const keeper = chooseKeeper(group.docs, group.canonicalKey, scorer);
    const duplicateDocs = group.docs.filter((doc) => objectIdToString(doc._id) !== objectIdToString(keeper._id));

    duplicateGroups.push({
      kind,
      scope: group.scope,
      canonicalKey: group.canonicalKey,
      keeper: summarizeDoc(keeper),
      duplicates: duplicateDocs.map(summarizeDoc),
    });

    for (const doc of duplicateDocs) {
      changes.push({
        kind,
        collectionName: collection.collectionName,
        action: "unset-duplicate-canonical-url",
        _id: objectIdToString(doc._id),
        canonicalKey: group.canonicalKey,
        previousCanonicalUrl: doc.canonicalUrl,
        keptDocumentId: objectIdToString(keeper._id),
        doc: summarizeDoc(doc),
      });
    }
  }

  for (const doc of blankDocs) {
    changes.push({
      kind,
      collectionName: collection.collectionName,
      action: "unset-blank-canonical-url",
      _id: objectIdToString(doc._id),
      previousCanonicalUrl: doc.canonicalUrl,
      doc: summarizeDoc(doc),
    });
  }

  return {
    scanned: docs.length,
    blankCanonicalCount: blankDocs.length,
    duplicateGroups,
    changes,
  };
}

async function applyChanges({ collection, kind, changes, nowIso }) {
  const results = [];

  for (const change of changes) {
    const update =
      kind === "marketing-blog"
        ? { $unset: { canonicalUrl: "" }, $set: { updatedAt: new Date(nowIso) } }
        : { $unset: { canonicalUrl: "" }, $set: { updatedAt: nowIso } };

    const result = await collection.updateOne(
      { _id: new ObjectId(change._id) },
      update,
    );

    results.push({
      ...change,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  }

  return results;
}

function keysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function ensureIndex({ collection, key, options }) {
  const indexes = await collection.indexes();
  const existing = indexes.find((index) => keysEqual(index.key, key));

  if (existing) {
    if (!existing.unique) {
      return {
        status: "conflict",
        message: `Existing index ${existing.name} has same key but is not unique.`,
        existing,
      };
    }

    return {
      status: "exists",
      name: existing.name,
    };
  }

  const name = await collection.createIndex(key, options);
  return {
    status: "created",
    name,
  };
}

async function writeAudit(audit) {
  const dir = path.join(
    cwd,
    "logs",
    "data-cleanup",
    "canonical-url-duplicates",
    audit.runId,
  );
  await fs.mkdir(dir, { recursive: true });
  const auditPath = path.join(dir, "audit.json");
  await fs.writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  return auditPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.apply && !args.yes) {
    throw new Error("Refusing to mutate data without --yes. Re-run with --apply --yes after reviewing dry-run output.");
  }

  const primaryUri = process.env.MONGODB_URI;
  const marketingUri = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;
  const primaryDbName = args.primaryDbName || process.env.MONGODB_DB || process.env.MONGODB_DATABASE;
  const marketingDbName =
    args.marketingDbName ||
    process.env.MARKETING_DB_NAME ||
    process.env.MARKETING_MONGODB_DB ||
    DEFAULT_MARKETING_DB_NAME;

  if (!primaryUri) {
    throw new Error("MONGODB_URI is required.");
  }

  if (!marketingUri) {
    throw new Error("MARKETING_DB_URI or MONGODB_URI is required.");
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const nowIso = new Date().toISOString();
  const mode = args.apply ? "apply" : "dry-run";
  const primaryClient = new MongoClient(primaryUri, { maxPoolSize: 2 });
  const marketingClient = new MongoClient(marketingUri, { maxPoolSize: 2 });

  const audit = {
    runId,
    generatedAt: nowIso,
    mode,
    includeNormalized: args.includeNormalized,
    ensureIndexes: args.apply && args.ensureIndexes,
    connections: {
      primary: {
        uri: redactMongoUri(primaryUri),
        dbName: primaryDbName || "(uri default)",
        collection: DEFAULT_PRIMARY_COLLECTION,
      },
      marketing: {
        uri: redactMongoUri(marketingUri),
        dbName: marketingDbName,
        collection: DEFAULT_MARKETING_COLLECTION,
      },
    },
    collections: {},
    plannedChanges: [],
    appliedChanges: [],
    indexResults: [],
    verification: {},
  };

  try {
    await Promise.all([primaryClient.connect(), marketingClient.connect()]);

    const primaryDb = resolveDb(primaryClient, primaryDbName);
    const marketingDb = marketingClient.db(marketingDbName);
    const primaryCollection = primaryDb.collection(DEFAULT_PRIMARY_COLLECTION);
    const marketingCollection = marketingDb.collection(DEFAULT_MARKETING_COLLECTION);

    audit.connections.primary.resolvedDbName = primaryDb.databaseName;
    audit.connections.marketing.resolvedDbName = marketingDb.databaseName;

    const [aiPlan, marketingPlan] = await Promise.all([
      collectPlans({
        collection: primaryCollection,
        kind: "ai-blogger-post",
        scopeField: "agencyId",
        scorer: scoreAiBloggerPost,
        includeNormalized: args.includeNormalized,
      }),
      collectPlans({
        collection: marketingCollection,
        kind: "marketing-blog",
        scopeField: null,
        scorer: scoreMarketingBlog,
        includeNormalized: args.includeNormalized,
      }),
    ]);

    audit.collections.aiBloggerPosts = {
      scanned: aiPlan.scanned,
      blankCanonicalCount: aiPlan.blankCanonicalCount,
      duplicateGroupCount: aiPlan.duplicateGroups.length,
      duplicateGroups: aiPlan.duplicateGroups,
    };
    audit.collections.marketingBlogs = {
      scanned: marketingPlan.scanned,
      blankCanonicalCount: marketingPlan.blankCanonicalCount,
      duplicateGroupCount: marketingPlan.duplicateGroups.length,
      duplicateGroups: marketingPlan.duplicateGroups,
    };
    audit.plannedChanges = [...aiPlan.changes, ...marketingPlan.changes];

    if (args.apply) {
      const [aiApplied, marketingApplied] = await Promise.all([
        applyChanges({
          collection: primaryCollection,
          kind: "ai-blogger-post",
          changes: aiPlan.changes,
          nowIso,
        }),
        applyChanges({
          collection: marketingCollection,
          kind: "marketing-blog",
          changes: marketingPlan.changes,
          nowIso,
        }),
      ]);
      audit.appliedChanges = [...aiApplied, ...marketingApplied];

      const [aiVerification, marketingVerification] = await Promise.all([
        collectPlans({
          collection: primaryCollection,
          kind: "ai-blogger-post",
          scopeField: "agencyId",
          scorer: scoreAiBloggerPost,
          includeNormalized: args.includeNormalized,
        }),
        collectPlans({
          collection: marketingCollection,
          kind: "marketing-blog",
          scopeField: null,
          scorer: scoreMarketingBlog,
          includeNormalized: args.includeNormalized,
        }),
      ]);

      audit.verification = {
        aiBloggerPosts: {
          remainingBlankCanonicalCount: aiVerification.blankCanonicalCount,
          remainingDuplicateGroupCount: aiVerification.duplicateGroups.length,
          remainingDuplicateGroups: aiVerification.duplicateGroups,
        },
        marketingBlogs: {
          remainingBlankCanonicalCount: marketingVerification.blankCanonicalCount,
          remainingDuplicateGroupCount: marketingVerification.duplicateGroups.length,
          remainingDuplicateGroups: marketingVerification.duplicateGroups,
        },
      };

      const hasRemainingDuplicates =
        aiVerification.duplicateGroups.length > 0 ||
        marketingVerification.duplicateGroups.length > 0;

      if (args.ensureIndexes && !hasRemainingDuplicates) {
        const [aiIndexResult, marketingIndexResult] = await Promise.all([
          ensureIndex({
            collection: primaryCollection,
            key: { agencyId: 1, canonicalUrl: 1 },
            options: {
              name: "agencyId_1_canonicalUrl_1_unique_non_empty",
              unique: true,
              partialFilterExpression: {
                canonicalUrl: { $exists: true, $gt: "" },
              },
            },
          }),
          ensureIndex({
            collection: marketingCollection,
            key: { canonicalUrl: 1 },
            options: {
              name: "canonicalUrl_1_unique_non_empty",
              unique: true,
              partialFilterExpression: {
                canonicalUrl: { $exists: true, $gt: "" },
              },
            },
          }),
        ]);

        audit.indexResults = [
          {
            kind: "ai-blogger-post",
            collection: DEFAULT_PRIMARY_COLLECTION,
            ...aiIndexResult,
          },
          {
            kind: "marketing-blog",
            collection: DEFAULT_MARKETING_COLLECTION,
            ...marketingIndexResult,
          },
        ];
      }
    }

    const auditPath = await writeAudit(audit);
    console.log(JSON.stringify({
      mode,
      auditPath,
      aiBlogger: {
        scanned: audit.collections.aiBloggerPosts.scanned,
        duplicateGroups: audit.collections.aiBloggerPosts.duplicateGroupCount,
        blankCanonicals: audit.collections.aiBloggerPosts.blankCanonicalCount,
      },
      marketing: {
        scanned: audit.collections.marketingBlogs.scanned,
        duplicateGroups: audit.collections.marketingBlogs.duplicateGroupCount,
        blankCanonicals: audit.collections.marketingBlogs.blankCanonicalCount,
      },
      plannedChanges: audit.plannedChanges.length,
      appliedChanges: audit.appliedChanges.length,
      indexResults: audit.indexResults.map((result) => ({
        kind: result.kind,
        status: result.status,
        name: result.name,
        message: result.message,
      })),
      verification: audit.verification,
    }, null, 2));
  } finally {
    await Promise.allSettled([
      primaryClient.close(),
      marketingClient.close(),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
