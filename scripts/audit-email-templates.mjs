import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const constantsPath = path.join(root, "lib", "email-constants.ts");
const templateScriptPath = path.join(root, "scripts", "create-email-templates.js");

const constantsSource = fs.readFileSync(constantsPath, "utf8");
const templateSource = fs.readFileSync(templateScriptPath, "utf8");

const constantsBlock = constantsSource.match(/export const EMAIL_TEMPLATES = \{([\s\S]*?)\} as const;/)?.[1] || "";
const constantKeys = [...constantsBlock.matchAll(/^\s*([A-Z0-9_]+):\s*\d+,/gm)].map((match) => match[1]);
const templateKeys = [...templateSource.matchAll(/key:\s*['"]([A-Z0-9_]+)['"]/g)].map((match) => match[1]);

const missingFromScript = constantKeys.filter((key) => !templateKeys.includes(key));
const extraInScript = templateKeys.filter((key) => !constantKeys.includes(key));
const duplicateTemplateKeys = templateKeys.filter((key, index) => templateKeys.indexOf(key) !== index);

const failures = [];

if (missingFromScript.length > 0) {
  failures.push(`Missing from scripts/create-email-templates.js: ${missingFromScript.join(", ")}`);
}

if (extraInScript.length > 0) {
  failures.push(`Extra template keys in scripts/create-email-templates.js: ${extraInScript.join(", ")}`);
}

if (duplicateTemplateKeys.length > 0) {
  failures.push(`Duplicate template keys in scripts/create-email-templates.js: ${[...new Set(duplicateTemplateKeys)].join(", ")}`);
}

if (/params\.PASSWORD/.test(templateSource)) {
  failures.push("Account templates must not include {{params.PASSWORD}}.");
}

if (/(?<!\{)\{params\.[A-Z0-9_]+}}/.test(templateSource)) {
  failures.push("Malformed Brevo variable found. Use {{params.NAME}}, not {params.NAME}}.");
}

if (/[₹$€£]\s*{{params\.(AMOUNT|BUDGET)}}/.test(templateSource)) {
  failures.push("Amount and budget params are already formatted in code; templates must not prefix a currency symbol.");
}

if (failures.length > 0) {
  console.error("Email template audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Email template audit passed (${constantKeys.length} constants, ${templateKeys.length} script templates).`);
