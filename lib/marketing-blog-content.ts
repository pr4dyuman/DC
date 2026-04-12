import { normalizeInternalLinkHref } from "./ai-blogger-internal-link-utils";
import { normalizeMarketingSiteOrigin } from "./marketing-blog-utils";

type MarketingBlogInternalLink = {
    href?: string;
    anchorText?: string;
    title?: string;
};

type BuildMarketingBlogHtmlOptions = {
    internalLinks?: MarketingBlogInternalLink[];
    siteUrl?: string;
};

const HTML_BLOCK_TAG_PATTERN = /<(?:article|aside|blockquote|br|code|div|figure|figcaption|h[1-6]|hr|img|li|ol|p|pre|section|table|tbody|td|th|thead|tr|ul)\b/i;
const HTML_INLINE_TAG_PATTERN = /<\/?[a-z][^>]*>/i;
const FAQ_HEADING_PATTERN = String.raw`(?:faq|faqs|frequently asked questions?)`;
const FAQ_HTML_SECTION_PATTERN = new RegExp(
    String.raw`\s*<h([23])[^>]*>\s*${FAQ_HEADING_PATTERN}\s*<\/h\1>[\s\S]*?(?=\s*<h[23][^>]*>|\s*$)`,
    "gi",
);
const FAQ_MARKDOWN_SECTION_PATTERN = new RegExp(
    String.raw`(?:^|\n)#{2,3}\s*${FAQ_HEADING_PATTERN}\s*$[\s\S]*?(?=(?:\n#{2,3}\s+)|\s*$)`,
    "gim",
);

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNewlines(value: string) {
    return value.replace(/\r\n?/g, "\n");
}

function collapseFaqSectionSpacing(value: string) {
    return normalizeNewlines(value)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function stripStandaloneFaqSection(content?: string) {
    const rawContent = normalizeNewlines(content?.trim() || "");
    if (!rawContent) {
        return "";
    }

    const stripped = contentLooksLikeHtml(rawContent)
        ? rawContent.replace(FAQ_HTML_SECTION_PATTERN, "")
        : rawContent.replace(FAQ_MARKDOWN_SECTION_PATTERN, "");

    return collapseFaqSectionSpacing(stripped);
}

export function contentHasStandaloneFaqSection(content?: string) {
    const rawContent = normalizeNewlines(content?.trim() || "");
    if (!rawContent) {
        return false;
    }

    const pattern = contentLooksLikeHtml(rawContent)
        ? new RegExp(FAQ_HTML_SECTION_PATTERN.source, "i")
        : new RegExp(FAQ_MARKDOWN_SECTION_PATTERN.source, "im");

    return pattern.test(rawContent);
}

function isSafeHref(value: string) {
    return /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(value.trim());
}

function resolveInternalLinkCandidates(link: MarketingBlogInternalLink, siteUrl?: string) {
    const rawHref = link.href?.trim() || "";
    const normalizedHref = normalizeInternalLinkHref(rawHref, siteUrl) || rawHref;
    const normalizedSiteOrigin = normalizeMarketingSiteOrigin(siteUrl)?.replace(/\/+$/, "") || "";
    const absoluteHref =
        normalizedHref.startsWith("/") && normalizedSiteOrigin
            ? `${normalizedSiteOrigin}${normalizedHref}`
            : normalizedHref;

    return Array.from(
        new Set(
            [rawHref, normalizedHref, absoluteHref]
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    ).sort((left, right) => right.length - left.length);
}

// ─── Internal link injection for already-HTML content ────────────────────────
// When the pipeline produces HTML directly, we need to inject missing internal
// links by scanning text nodes (content between tags) for unlinked anchor text
// occurrences and wrapping them with the appropriate <a> tag.
function injectInternalLinksIntoHtml(
    content: string,
    internalLinks: MarketingBlogInternalLink[] | undefined,
    siteUrl?: string,
): string {
    if (!content.trim() || !internalLinks?.length) {
        return content;
    }

    let result = content;

    for (const link of internalLinks) {
        const anchorText = link.anchorText?.trim() || link.title?.trim() || "";
        const resolvedHref = normalizeInternalLinkHref(link.href, siteUrl) || link.href?.trim() || "";

        if (!anchorText || !resolvedHref || !isSafeHref(resolvedHref)) {
            continue;
        }

        const safeAnchor = escapeRegex(anchorText);
        const safeHref = escapeHtml(resolvedHref);

        // Match the anchor text only when it is:
        //   - NOT preceded by href=" or href=' (already in a link attribute)
        //   - NOT inside an existing <a ...> tag
        // Strategy: split on existing <a...>...</a> blocks and only replace in
        // text segments outside those blocks. This avoids parsing full HTML with
        // regex which is fragile.
        const anchorTagPattern = /(<a[\s\S]*?<\/a>)/gi;
        const parts = result.split(anchorTagPattern);

        let replaced = false;
        const newParts = parts.map((part) => {
            // If this part is an anchor tag itself, leave it untouched
            if (/^<a[\s\S]*<\/a>$/i.test(part)) {
                return part;
            }

            if (replaced) {
                return part;
            }

            // Only replace the FIRST occurrence of the anchor text in plain/HTML text
            // to avoid over-linking (Google penalises the same anchor text multiple times)
            const replacePattern = new RegExp(
                `((?:^|>)[^<]*)\\b(${safeAnchor})\\b`,
                "i",
            );

            const newPart = part.replace(replacePattern, (_, before, match) => {
                replaced = true;
                return `${before}<a href="${safeHref}">${match}</a>`;
            });

            return newPart;
        });

        result = newParts.join("");
    }

    return result;
}
// ─────────────────────────────────────────────────────────────────────────────

function injectTrackedInternalLinks(
    content: string,
    internalLinks: MarketingBlogInternalLink[] | undefined,
    siteUrl?: string,
) {
    if (!content.trim() || !internalLinks?.length) {
        return content;
    }

    let result = content;
    const replacements: Array<{ placeholder: string; markdownLink: string }> = [];

    internalLinks.forEach((link, linkIndex) => {
        const anchorText = link.anchorText?.trim() || link.title?.trim() || "";
        const resolvedHref = normalizeInternalLinkHref(link.href, siteUrl) || link.href?.trim() || "";

        if (!anchorText || !resolvedHref || !isSafeHref(resolvedHref)) {
            return;
        }

        const markdownLink = `[${anchorText}](${resolvedHref})`;

        resolveInternalLinkCandidates(link, siteUrl).forEach((candidate, candidateIndex) => {
            const placeholder = `__MARKETING_INTERNAL_LINK_${linkIndex}_${candidateIndex}__`;
            const pattern = new RegExp(
                `(^|[\\s"'])(${escapeRegex(candidate)})(?=([\\s)"'.,!?;:]|$))`,
                "g",
            );

            replacements.push({ placeholder, markdownLink });
            result = result.replace(pattern, (_, prefix) => `${prefix}${placeholder}`);
        });
    });

    for (const replacement of replacements) {
        result = result.split(replacement.placeholder).join(replacement.markdownLink);
    }

    return result;
}

function extractMarkdownLinks(value: string) {
    const tokens: Array<{ token: string; html: string }> = [];
    let tokenIndex = 0;

    const content = value.replace(
        /\[([^\]]+)\]\((\/(?!\/)[^) \t]+|https?:\/\/[^) \t]+|mailto:[^) \t]+|tel:[^) \t]+)\)/g,
        (_, label: string, href: string) => {
            if (!isSafeHref(href)) {
                return label;
            }

            const token = `__MARKETING_LINK_TOKEN_${tokenIndex}__`;
            const safeHref = escapeHtml(href.trim());
            const safeLabel = escapeHtml(label.trim());
            tokens.push({
                token,
                html: `<a href="${safeHref}">${safeLabel}</a>`,
            });
            tokenIndex += 1;
            return token;
        },
    );

    return { content, tokens };
}

function renderInlineContent(value: string) {
    const { content, tokens } = extractMarkdownLinks(value.trim());
    let rendered = escapeHtml(content);

    rendered = rendered
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>");

    for (const token of tokens) {
        rendered = rendered.replace(token.token, token.html);
    }

    return rendered;
}

function flushListBlock(blocks: string[], listType: "ul" | "ol" | null, items: string[]) {
    if (!listType || items.length === 0) {
        return;
    }

    blocks.push(
        `<${listType}>${items.map((item) => `<li>${renderInlineContent(item)}</li>`).join("")}</${listType}>`,
    );
}

function flushParagraphBlock(blocks: string[], lines: string[]) {
    if (lines.length === 0) {
        return;
    }

    const paragraph = lines
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ");

    if (paragraph) {
        blocks.push(`<p>${renderInlineContent(paragraph)}</p>`);
    }
}

function convertMarkdownLikeContentToHtml(content: string) {
    const blocks: string[] = [];
    const paragraphLines: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let listItems: string[] = [];

    const flushParagraph = () => flushParagraphBlock(blocks, paragraphLines.splice(0));
    const flushList = () => {
        flushListBlock(blocks, listType, listItems);
        listType = null;
        listItems = [];
    };

    for (const rawLine of normalizeNewlines(content).split("\n")) {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushList();
            continue;
        }

        // Handle deeper headings (H4–H6) before H3/H2 since the patterns overlap
        const h456Match = line.match(/^(#{4,6})\s+(.+)$/);
        if (h456Match) {
            flushParagraph();
            flushList();
            const level = Math.min(h456Match[1].length, 6);
            blocks.push(`<h${level}>${renderInlineContent(h456Match[2])}</h${level}>`);
            continue;
        }

        const h3Match = line.match(/^###\s+(.+)$/);
        if (h3Match) {
            flushParagraph();
            flushList();
            blocks.push(`<h3>${renderInlineContent(h3Match[1])}</h3>`);
            continue;
        }

        const h2Match = line.match(/^##\s+(.+)$/);
        if (h2Match) {
            flushParagraph();
            flushList();
            blocks.push(`<h2>${renderInlineContent(h2Match[1])}</h2>`);
            continue;
        }

        const orderedListMatch = line.match(/^\d+\.\s+(.+)$/);
        if (orderedListMatch) {
            flushParagraph();
            if (listType !== "ol") {
                flushList();
                listType = "ol";
            }
            listItems.push(orderedListMatch[1]);
            continue;
        }

        const unorderedListMatch = line.match(/^[-*]\s+(.+)$/);
        if (unorderedListMatch) {
            flushParagraph();
            if (listType !== "ul") {
                flushList();
                listType = "ul";
            }
            listItems.push(unorderedListMatch[1]);
            continue;
        }

        if (line.startsWith(">")) {
            flushParagraph();
            flushList();
            blocks.push(`<blockquote><p>${renderInlineContent(line.replace(/^>\s?/, ""))}</p></blockquote>`);
            continue;
        }

        flushList();
        paragraphLines.push(line);
    }

    flushParagraph();
    flushList();

    return blocks.join("\n");
}

export function contentLooksLikeHtml(content?: string) {
    const value = content?.trim() || "";
    if (!value) {
        return false;
    }

    return HTML_BLOCK_TAG_PATTERN.test(value) || HTML_INLINE_TAG_PATTERN.test(value);
}

export function buildMarketingBlogHtml(
    content?: string,
    options?: BuildMarketingBlogHtmlOptions,
) {
    const rawContent = normalizeNewlines(content?.trim() || "");
    if (!rawContent) {
        return "";
    }

    // ── HTML Content Path ──────────────────────────────────────────────────────
    // The AI pipeline emits HTML directly. In this case we skip the markdown
    // converter but still inject internal links using the HTML-aware injector.
    if (contentLooksLikeHtml(rawContent)) {
        return injectInternalLinksIntoHtml(
            rawContent,
            options?.internalLinks,
            options?.siteUrl,
        );
    }

    // ── Markdown/Plain Text Path ───────────────────────────────────────────────
    const contentWithInlineLinks = injectTrackedInternalLinks(
        rawContent,
        options?.internalLinks,
        options?.siteUrl,
    );

    return convertMarkdownLikeContentToHtml(contentWithInlineLinks);
}
