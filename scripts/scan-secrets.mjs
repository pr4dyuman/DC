import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".swc",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "exports",
  "logs",
  "node_modules",
  "out",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "tsconfig.tsbuildinfo",
]);

const DETECTORS = [
  {
    name: "MongoDB URI",
    pattern: /mongodb(?:\+srv)?:\/\/[^\s"'<>`]+/i,
  },
  {
    name: "Brevo/SendinBlue API key",
    pattern: /xkeysib-[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "Groq API key",
    pattern: /gsk_[A-Za-z0-9_-]{20,}/,
  },
];

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* walk(path);
      }
      continue;
    }

    if (entry.isFile() && !SKIP_FILES.has(entry.name)) {
      yield path;
    }
  }
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

const findings = [];

for await (const file of walk(ROOT)) {
  let text;

  try {
    const buffer = await readFile(file);
    if (buffer.includes(0)) {
      continue;
    }
    text = buffer.toString("utf8");
  } catch {
    continue;
  }

  for (const detector of DETECTORS) {
    const match = detector.pattern.exec(text);
    if (!match) {
      continue;
    }

    findings.push({
      file: relative(ROOT, file),
      line: lineNumberForIndex(text, match.index),
      type: detector.name,
    });
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found. Values are intentionally hidden:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.type})`);
  }
  process.exit(1);
}

console.log("No MongoDB URI, Brevo/SendinBlue key, or Groq key patterns found.");
