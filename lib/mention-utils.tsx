import React from "react";
import Link from "next/link";

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

/**
 * Render comment text with clickable @mention chips that navigate to the user's profile.
 * Mention format: @[Display Name](userId)
 */
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
        const userId = match[2];
        parts.push(
            <Link
                key={match.index}
                href={`/dashboard/team/${userId}`}
                className="inline-flex items-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold rounded px-1 hover:bg-indigo-500/20 hover:underline transition-colors text-[0.85em]"
                title={`View ${displayName}'s profile`}
            >
                @{displayName}
            </Link>
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}
