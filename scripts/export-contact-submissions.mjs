import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DEFAULT_DB_NAME = "marketing-blog";
const DEFAULT_COLLECTION = "contacts";
const DEFAULT_DAYS_BACK = 6;

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function getIstParts(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function fromIstParts(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms) - IST_OFFSET_MS);
}

function addIstDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function formatIst(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = getIstParts(date);
  return `${parts.year}-${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)} ${formatTwoDigits(parts.hour)}:${formatTwoDigits(parts.minute)}:${formatTwoDigits(parts.second)} IST`;
}

function formatIstDate(date) {
  const parts = getIstParts(date);
  return `${parts.year}-${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)}`;
}

function parseIstDate(value, endOfDay = false) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD.`);
  }

  const [, year, month, day] = match.map(Number);
  return endOfDay
    ? fromIstParts(year, month, day, 23, 59, 59, 999)
    : fromIstParts(year, month, day, 0, 0, 0, 0);
}

function getReadableWordCount(value) {
  return String(value || "").match(/[A-Za-z0-9][A-Za-z0-9'-]{1,}/g)?.length || 0;
}

function looksLikeRandomToken(value) {
  const text = String(value || "").trim();
  return text.length >= 12 && /^[A-Za-z]+$/.test(text) && /[a-z]/.test(text) && /[A-Z]/.test(text);
}

function hasValidEmail(value) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(value || "").trim());
}

function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function hasValidPhoneLength(value) {
  const digits = getPhoneDigits(value);
  return digits.length >= 10 && digits.length <= 13;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function analyzeSubmission(submission, aggregate) {
  const issues = [];
  const notes = [];

  const randomTokenFields = ["senderName", "companyName", "message"].filter((field) =>
    looksLikeRandomToken(submission[field])
  );
  const messageWordCount = getReadableWordCount(submission.message);
  const phoneDigits = getPhoneDigits(submission.phoneNumber);
  const emailKey = normalizeText(submission.senderEmail);
  const phoneKey = phoneDigits;
  const testPattern = /\b(test|testing|dummy|sample|asdf|qwerty|lorem)\b/i;

  if (!submission.senderName) issues.push("missing_name");
  if (!hasValidEmail(submission.senderEmail)) issues.push("invalid_email_format");
  if (!submission.phoneNumber || !hasValidPhoneLength(submission.phoneNumber)) issues.push("invalid_phone_length");
  if (!submission.message || String(submission.message).trim().length < 10) issues.push("message_too_short");
  if (messageWordCount < 2) issues.push("message_has_too_few_readable_words");
  if (randomTokenFields.length >= 2) issues.push("likely_random_generated_text");
  if (/(\d)\1{6,}/.test(phoneDigits)) issues.push("phone_has_repeated_digits");
  if (testPattern.test(`${submission.senderName} ${submission.companyName} ${submission.message}`)) {
    notes.push("appears_to_be_test_submission");
  }
  if (aggregate.emailCounts.get(emailKey) > 1) notes.push("email_repeats_in_export_window");
  if (phoneKey && aggregate.phoneCounts.get(phoneKey) > 1) notes.push("phone_repeats_in_export_window");

  let status = "looks_ok";
  let recommendedAction = "follow_up";

  if (issues.includes("likely_random_generated_text")) {
    status = "likely_spam_bot";
    recommendedAction = "ignore_or_delete";
  } else if (issues.length > 0) {
    status = "needs_review";
    recommendedAction = "review_before_follow_up";
  } else if (notes.includes("appears_to_be_test_submission")) {
    status = "test_submission";
    recommendedAction = "no_client_follow_up_needed";
  }

  return {
    status,
    recommendedAction,
    issues,
    notes,
    metrics: {
      messageWordCount,
      randomTokenFields,
      phoneDigitCount: phoneDigits.length,
    },
  };
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function summarize(submissions) {
  const statusCounts = submissions.reduce((counts, submission) => {
    counts[submission.analysis.status] = (counts[submission.analysis.status] || 0) + 1;
    return counts;
  }, {});

  const issueCounts = submissions.reduce((counts, submission) => {
    for (const issue of submission.analysis.issues) {
      counts[issue] = (counts[issue] || 0) + 1;
    }
    return counts;
  }, {});

  return {
    totalSubmissions: submissions.length,
    statusCounts,
    issueCounts,
  };
}

async function main() {
  const uri = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MARKETING_DB_URI or MONGODB_URI is required.");
  }

  const dbName = getArgValue("db", DEFAULT_DB_NAME);
  const collectionName = getArgValue("collection", DEFAULT_COLLECTION);
  const daysBack = Number(getArgValue("days", DEFAULT_DAYS_BACK));
  const now = new Date();
  const nowIst = getIstParts(now);
  const todayStartIstUtc = fromIstParts(nowIst.year, nowIst.month, nowIst.day);
  const defaultStartUtc = addIstDays(todayStartIstUtc, -daysBack);
  const defaultEndUtc = fromIstParts(nowIst.year, nowIst.month, nowIst.day, 23, 59, 59, 999);
  const startUtc = parseIstDate(getArgValue("from", ""), false) || defaultStartUtc;
  const endUtc = parseIstDate(getArgValue("to", ""), true) || defaultEndUtc;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();

  try {
    const docs = await client
      .db(dbName)
      .collection(collectionName)
      .find({ createdAt: { $gte: startUtc, $lte: endUtc } })
      .sort({ createdAt: -1 })
      .toArray();

    const submissions = docs.map((doc) => ({
      id: String(doc._id),
      dateUtc: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
      dateIst: formatIst(doc.createdAt),
      senderName: doc.fullName || "",
      senderEmail: doc.email || "",
      phoneNumber: doc.phone || "",
      companyName: doc.companyName || "",
      message: doc.message || "",
      updatedAtUtc: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
      updatedAtIst: formatIst(doc.updatedAt),
    }));

    const aggregate = {
      emailCounts: countBy(submissions, (submission) => normalizeText(submission.senderEmail)),
      phoneCounts: countBy(submissions, (submission) => getPhoneDigits(submission.phoneNumber)),
    };

    const analyzedSubmissions = submissions.map((submission) => ({
      ...submission,
      analysis: analyzeSubmission(submission, aggregate),
    }));

    const exportData = {
      exportedAtUtc: now.toISOString(),
      exportedAtIst: formatIst(now),
      sourceDatabase: dbName,
      sourceCollection: collectionName,
      includedFromIst: formatIst(startUtc),
      includedThroughIst: formatIst(endUtc),
      count: analyzedSubmissions.length,
      summary: summarize(analyzedSubmissions),
      submissions: analyzedSubmissions,
    };

    const outputPath =
      getArgValue("out", "") ||
      path.join(
        "exports",
        `contact-us-submissions-${formatIstDate(startUtc)}-to-${formatIstDate(endUtc)}-analysis.json`
      );

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(exportData, null, 2)}\n`);

    console.log(`Exported ${analyzedSubmissions.length} contact submissions to ${outputPath}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
