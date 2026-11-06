#!/usr/bin/env node
/**
 * Turns a template's listing screenshots into the images the /templates store
 * uses, and prints the `card` and `tour` code for lib/marketing-templates.ts.
 *
 *   npm run templates:images -- --slug <slug> --shots <folder> [--pages a,b,c]
 *
 *   --slug   URL name of the template, for example academy-education.
 *   --shots  Folder with the extracted listing screenshots (screenshots.zip in
 *            the codester-themes repository): <page>-1440.png for desktop and,
 *            when there is one, <page>-390.png for mobile.
 *   --pages  Pages for the page tour, in order, by screenshot name (index is the
 *            home page). Defaults to every desktop screenshot except the 404
 *            page. Six is plenty.
 *
 * Writes public/templates/<slug>/: <page>-desktop.webp, <page>-mobile.webp,
 * card.webp (the hover preview) and og.jpg (the social sharing image).
 * Only screenshots go into this public repository, never template source.
 * See doc/templates-store.md for the whole process.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const WEBP_MAX_HEIGHT = 16380; // WebP cannot store an image taller than 16383 px.
const CARD_SOURCE_HEIGHT = 4800;
const CARD_WIDTH = 960;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function readOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!name.startsWith("--")) {
      fail(`Unexpected argument "${name}". Usage: npm run templates:images -- --slug <slug> --shots <folder> [--pages a,b,c]`);
    }
    options[name.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

function toLabel(page) {
  if (page === "index") return "Home";
  const words = page.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    fail('The "sharp" image library did not load on this computer. Install it with:\n  npm install --no-save sharp\nthen run this command again.');
  }
}

async function writeWebp(sharp, source, target, quality) {
  const { width, height } = await sharp(source, { limitInputPixels: false }).metadata();
  const pipeline = sharp(source, { limitInputPixels: false });
  if (height > WEBP_MAX_HEIGHT) {
    pipeline.extract({ left: 0, top: 0, width, height: WEBP_MAX_HEIGHT });
  }
  const info = await pipeline.webp({ quality, effort: 6 }).toFile(target);
  return { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
}

function imageCall(slug, file, image) {
  return `image("${slug}", "${file}", ${image.width}, ${image.height})`;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const slug = options.slug;
  const shotsDir = options.shots ? path.resolve(options.shots) : "";

  if (!slug || !SLUG_PATTERN.test(slug)) {
    fail('Give the template a --slug in lowercase words joined by hyphens, for example --slug academy-education');
  }
  if (!shotsDir || !existsSync(shotsDir)) {
    fail(`Screenshot folder not found: ${options.shots || "(missing --shots)"}`);
  }

  const files = await readdir(shotsDir);
  const desktopPages = files
    .filter((file) => file.endsWith("-1440.png"))
    .map((file) => file.replace(/-1440\.png$/, ""));
  const pages = options.pages
    ? options.pages.split(",").map((page) => page.trim()).filter(Boolean)
    : ["index", ...desktopPages.filter((page) => page !== "index" && page !== "404").sort()];

  if (!desktopPages.includes("index")) {
    fail(`index-1440.png (the home page) is missing from ${shotsDir}. It is needed for the hover preview and the social image.`);
  }
  for (const page of pages) {
    if (!desktopPages.includes(page)) {
      fail(`${page}-1440.png is missing from ${shotsDir}. Desktop screenshots found: ${desktopPages.join(", ")}`);
    }
  }

  const sharp = await loadSharp();
  const outDir = path.join(process.cwd(), "public", "templates", slug);
  await mkdir(outDir, { recursive: true });

  const tour = [];
  let totalKb = 0;
  for (const page of pages) {
    const desktop = await writeWebp(sharp, path.join(shotsDir, `${page}-1440.png`), path.join(outDir, `${page}-desktop.webp`), 70);
    totalKb += desktop.kb;

    let mobile = null;
    const mobileSource = path.join(shotsDir, `${page}-390.png`);
    if (existsSync(mobileSource)) {
      mobile = await writeWebp(sharp, mobileSource, path.join(outDir, `${page}-mobile.webp`), 72);
      totalKb += mobile.kb;
    }

    tour.push({ page, desktop, mobile });
    console.log(`  ${page}: desktop ${desktop.width}x${desktop.height}${mobile ? `, mobile ${mobile.width}x${mobile.height}` : ", no mobile screenshot"}`);
  }

  const home = path.join(shotsDir, "index-1440.png");
  const homeSize = await sharp(home, { limitInputPixels: false }).metadata();

  const cardInfo = await sharp(home, { limitInputPixels: false })
    .extract({ left: 0, top: 0, width: homeSize.width, height: Math.min(homeSize.height, CARD_SOURCE_HEIGHT) })
    .resize({ width: CARD_WIDTH })
    .webp({ quality: 72, effort: 6 })
    .toFile(path.join(outDir, "card.webp"));
  const card = { width: cardInfo.width, height: cardInfo.height };

  const ogSourceHeight = Math.min(homeSize.height, Math.round((homeSize.width * OG_HEIGHT) / OG_WIDTH));
  const ogInfo = await sharp(home, { limitInputPixels: false })
    .extract({ left: 0, top: 0, width: homeSize.width, height: ogSourceHeight })
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "top" })
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(path.join(outDir, "og.jpg"));
  totalKb += Math.round((cardInfo.size + ogInfo.size) / 1024);

  const tourCode = tour
    .map(({ page, desktop, mobile }) => {
      const lines = [
        "            {",
        `                id: "${page === "index" ? "home" : page}",`,
        `                label: "${toLabel(page)}",`,
        `                desktop: ${imageCall(slug, `${page}-desktop.webp`, desktop)},`,
      ];
      if (mobile) {
        lines.push(`                mobile: ${imageCall(slug, `${page}-mobile.webp`, mobile)},`);
      }
      lines.push("            },");
      return lines.join("\n");
    })
    .join("\n");

  console.log(`\nWrote public/templates/${slug}/ (${totalKb} KB).`);
  console.log("\nPaste into this template's entry in lib/marketing-templates.ts, and adjust the labels if needed:\n");
  console.log(`        card: ${imageCall(slug, "card.webp", card)},`);
  console.log(`        tour: [\n${tourCode}\n        ],`);
}

main().catch((error) => fail(error?.stack || String(error)));
