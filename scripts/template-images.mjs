#!/usr/bin/env node
/**
 * Turns a template's listing screenshots into the images the /templates store
 * uses, and prints the `card` and `tour` code for lib/marketing-templates.ts.
 *
 *   npm run templates:images -- --slug <slug> --shots <folder> [--pages a,b,c]
 *
 *   --slug   URL name of the template, for example academy-education.
 *   --shots  Folder with the extracted listing screenshots (screenshots.zip in
 *            the codester-themes repository). Either naming works:
 *            <page>-1440.png and <page>-390.png, or desktop-<page>.png and
 *            phone-<page>.png. A screens/ folder inside it is found too.
 *   --pages  Pages for the page tour, in order, by screenshot name (index is the
 *            home page). Defaults to every desktop screenshot except the 404
 *            page. Six is plenty.
 *   --trim-top  Cut a blank white strip off the top of each screenshot, for
 *            captures that start above the site's header. Leave it off for
 *            sites whose header is white.
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
      fail(`Unexpected argument "${name}". Usage: npm run templates:images -- --slug <slug> --shots <folder> [--pages a,b,c] [--trim-top]`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      options[name.slice(2)] = true;
    } else {
      options[name.slice(2)] = value;
      index += 1;
    }
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

// Rows of pure white at the top of a screenshot (0 when fewer than 20).
async function blankTopRows(sharp, source) {
  const { width, height } = await sharp(source, { limitInputPixels: false }).metadata();
  const rows = Math.min(300, height);
  const { data, info } = await sharp(source, { limitInputPixels: false })
    .extract({ left: 0, top: 0, width, height: rows })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = info.width * info.channels;
  let blank = 0;
  while (blank < rows && data.subarray(blank * stride, (blank + 1) * stride).every((value) => value === 255)) {
    blank += 1;
  }
  return blank >= 20 ? blank : 0;
}

async function writeWebp(sharp, source, target, quality, top = 0) {
  const { width, height } = await sharp(source, { limitInputPixels: false }).metadata();
  const pipeline = sharp(source, { limitInputPixels: false });
  if (top > 0 || height - top > WEBP_MAX_HEIGHT) {
    pipeline.extract({ left: 0, top, width, height: Math.min(height - top, WEBP_MAX_HEIGHT) });
  }
  const info = await pipeline.webp({ quality, effort: 6 }).toFile(target);
  return { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
}

// Finds each page's desktop and phone screenshot, whichever naming the
// template's listing uses.
function indexScreenshots(dir, files) {
  const shots = new Map();
  const patterns = [
    [/^(.+)-1440\.png$/, "desktop"],
    [/^(.+)-390\.png$/, "mobile"],
    [/^desktop-(.+)\.png$/, "desktop"],
    [/^(?:phone|mobile)-(.+)\.png$/, "mobile"],
  ];
  for (const file of files) {
    for (const [pattern, kind] of patterns) {
      const match = file.match(pattern);
      if (match) {
        shots.set(match[1], { ...shots.get(match[1]), [kind]: path.join(dir, file) });
        break;
      }
    }
  }
  return shots;
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

  let shots = indexScreenshots(shotsDir, await readdir(shotsDir));
  const nested = path.join(shotsDir, "screens");
  if (!shots.size && existsSync(nested)) {
    shots = indexScreenshots(nested, await readdir(nested));
  }
  const desktopPages = [...shots.keys()].filter((page) => shots.get(page).desktop);
  const pages = options.pages
    ? options.pages.split(",").map((page) => page.trim()).filter(Boolean)
    : ["index", ...desktopPages.filter((page) => page !== "index" && page !== "404").sort()];

  if (!desktopPages.includes("index")) {
    fail(`The home page screenshot (index-1440.png or desktop-index.png) is missing from ${shotsDir}. It is needed for the hover preview and the social image.`);
  }
  for (const page of pages) {
    if (!desktopPages.includes(page)) {
      fail(`No desktop screenshot of "${page}" in ${shotsDir}. Desktop screenshots found: ${desktopPages.join(", ")}`);
    }
  }

  const sharp = await loadSharp();
  const trimTop = options["trim-top"] === true;
  const topOf = async (source) => (trimTop ? blankTopRows(sharp, source) : 0);
  const outDir = path.join(process.cwd(), "public", "templates", slug);
  await mkdir(outDir, { recursive: true });

  const tour = [];
  let totalKb = 0;
  for (const page of pages) {
    const desktopTop = await topOf(shots.get(page).desktop);
    const desktop = await writeWebp(sharp, shots.get(page).desktop, path.join(outDir, `${page}-desktop.webp`), 70, desktopTop);
    totalKb += desktop.kb;

    let mobile = null;
    const mobileSource = shots.get(page).mobile;
    if (mobileSource) {
      mobile = await writeWebp(sharp, mobileSource, path.join(outDir, `${page}-mobile.webp`), 72, await topOf(mobileSource));
      totalKb += mobile.kb;
    }

    tour.push({ page, desktop, mobile });
    console.log(`  ${page}: desktop ${desktop.width}x${desktop.height}${mobile ? `, mobile ${mobile.width}x${mobile.height}` : ", no mobile screenshot"}${desktopTop ? ` (trimmed ${desktopTop}px blank strip)` : ""}`);
  }

  const home = shots.get("index").desktop;
  const homeSize = await sharp(home, { limitInputPixels: false }).metadata();
  const homeTop = await topOf(home);
  const homeHeight = homeSize.height - homeTop;

  const cardInfo = await sharp(home, { limitInputPixels: false })
    .extract({ left: 0, top: homeTop, width: homeSize.width, height: Math.min(homeHeight, CARD_SOURCE_HEIGHT) })
    .resize({ width: CARD_WIDTH })
    .webp({ quality: 72, effort: 6 })
    .toFile(path.join(outDir, "card.webp"));
  const card = { width: cardInfo.width, height: cardInfo.height };

  const ogSourceHeight = Math.min(homeHeight, Math.round((homeSize.width * OG_HEIGHT) / OG_WIDTH));
  const ogInfo = await sharp(home, { limitInputPixels: false })
    .extract({ left: 0, top: homeTop, width: homeSize.width, height: ogSourceHeight })
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
