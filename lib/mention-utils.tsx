import React from "react";

/** Regex to match @[Display Name](userId) mention format */
export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** Extract unique mentioned user IDs from comment text */
export function extractMentionedUserIds(text: string): string[] {
    const ids: string[] = [];
    let match;
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
        ids.push(match[2]);
    }
    return [...new Set(ids)];
}

/** Render comment text with blue clickable @mentions */
export function renderCommentText(text: string): React.ReactNode[] {
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const displayName = match[1];
        parts.push(
            <span
                key={match.index}
                className="text-blue-500 font-medium cursor-pointer hover:underline"
                title={displayName}
            >
                @{displayName}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}
