"use client";

import { useEffect, useMemo, useState } from "react";

const AI_BLOGGER_WORD_COUNT_EVENT = "ai-blogger:word-count-updated";

type AIBloggerWordCountDetail = {
    postId: string;
    wordCount: number;
};

export function publishAIBloggerWordCount(postId: string, wordCount: number) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<AIBloggerWordCountDetail>(AI_BLOGGER_WORD_COUNT_EVENT, {
            detail: {
                postId,
                wordCount: Math.max(0, Math.round(wordCount || 0)),
            },
        }),
    );
}

function useAIBloggerLiveWordCount(postId: string, initialWordCount: number) {
    const initialDisplayWordCount = useMemo(
        () => Math.max(0, Math.round(initialWordCount || 0)),
        [initialWordCount],
    );
    const [liveWordCount, setLiveWordCount] = useState<{
        postId: string;
        wordCount: number;
    } | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleUpdate = (event: Event) => {
            const detail = (event as CustomEvent<AIBloggerWordCountDetail>).detail;
            if (!detail || detail.postId !== postId) {
                return;
            }

            setLiveWordCount({
                postId,
                wordCount: Math.max(0, Math.round(detail.wordCount || 0)),
            });
        };

        window.addEventListener(AI_BLOGGER_WORD_COUNT_EVENT, handleUpdate as EventListener);
        return () => {
            window.removeEventListener(AI_BLOGGER_WORD_COUNT_EVENT, handleUpdate as EventListener);
        };
    }, [postId]);

    return liveWordCount?.postId === postId
        ? liveWordCount.wordCount
        : initialDisplayWordCount;
}

export function AIBloggerLiveWordCount({
    postId,
    initialWordCount,
    format = "words",
    minWords,
    maxWords,
    className,
}: {
    postId: string;
    initialWordCount: number;
    format?: "words" | "range";
    minWords?: number;
    maxWords?: number;
    className?: string;
}) {
    const wordCount = useAIBloggerLiveWordCount(postId, initialWordCount);

    const text = format === "range"
        ? `${wordCount} / ${minWords ?? 0}-${maxWords ?? 0}`
        : `${wordCount} words`;

    return <span className={className}>{text}</span>;
}
