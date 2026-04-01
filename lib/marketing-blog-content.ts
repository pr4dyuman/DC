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

    if (contentLooksLikeHtml(rawContent)) {
        return rawContent;
    }

    const contentWithInlineLinks = injectTrackedInternalLinks(
        rawContent,
        options?.internalLinks,
        options?.siteUrl,
    );

    return convertMarkdownLikeContentToHtml(contentWithInlineLinks);
}
