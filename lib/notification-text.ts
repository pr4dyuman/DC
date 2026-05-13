const MENTION_MARKUP_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;
const LEGACY_MENTION_MARKUP_REGEX = /@\(([^)]+)\)\(([^)]+)\)/g;

export function stripNotificationMentionMarkup(value: string): string {
    return value
        .replace(MENTION_MARKUP_REGEX, "@$1")
        .replace(LEGACY_MENTION_MARKUP_REGEX, "@$1")
        .replace(/\u00a0/g, " ");
}

export function getNotificationPreview(value: string, maxLength = 80): string {
    const normalized = stripNotificationMentionMarkup(value).replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
