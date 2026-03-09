"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
    /** Server action that fetches a page of items. Must accept (skip, limit) and return T[] */
    fetchFn: (skip: number, limit: number) => Promise<T[]>;
    /** Number of items to load per batch */
    pageSize: number;
    /** Initial data (if server-rendered) */
    initialData?: T[];
    /** Pixel distance from bottom to trigger next load (default: 200) */
    threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
    /** All loaded items */
    items: T[];
    /** Whether a fetch is in progress */
    isLoading: boolean;
    /** Whether there are more items to load */
    hasMore: boolean;
    /** Ref to attach to the scrollable container */
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    /** Ref to attach to a sentinel element at the bottom of the list */
    sentinelRef: React.RefObject<HTMLDivElement | null>;
    /** Manually reset and reload from scratch */
    reset: () => void;
    /** Replace items (e.g. after client-side filter change) and re-enable loading */
    setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useInfiniteScroll<T>({
    fetchFn,
    pageSize,
    initialData,
    threshold = 200,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
    const [items, setItems] = useState<T[]>(initialData ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const skipRef = useRef(initialData?.length ?? 0);
    const fetchFnRef = useRef(fetchFn);

    // Keep fetchFn ref current
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        try {
            const newItems = await fetchFnRef.current(skipRef.current, pageSize);
            if (newItems.length < pageSize) {
                setHasMore(false);
            }
            if (newItems.length > 0) {
                setItems(prev => [...prev, ...newItems]);
                skipRef.current += newItems.length;
            }
        } catch (err) {
            console.error("Infinite scroll fetch failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, pageSize]);

    // IntersectionObserver on sentinel element
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMore();
                }
            },
            {
                root: scrollContainerRef.current,
                rootMargin: `0px 0px ${threshold}px 0px`,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore, threshold]);

    const reset = useCallback(() => {
        setItems([]);
        skipRef.current = 0;
        setHasMore(true);
        setIsLoading(false);
    }, []);

    return {
        items,
        isLoading,
        hasMore,
        scrollContainerRef,
        sentinelRef,
        reset,
        setItems,
    };
}

/**
 * Progressive rendering for client-side filtered lists.
 * Shows `pageSize` items initially, reveals more as user scrolls to the sentinel.
 * Resets visible count when `resetDeps` change (e.g. search query, filters).
 */
export function useProgressiveList(
    totalCount: number,
    pageSize: number,
    resetDeps: unknown[] = []
) {
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        setSentinelNode(node);
    }, []);

    // Reset when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setVisibleCount(pageSize); }, resetDeps);

    useEffect(() => {
        if (!sentinelNode || visibleCount >= totalCount) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisibleCount(v => Math.min(v + pageSize, totalCount));
                }
            },
            { rootMargin: "0px 0px 200px 0px" }
        );
        obs.observe(sentinelNode);
        return () => obs.disconnect();
    }, [sentinelNode, visibleCount, totalCount, pageSize]);

    return {
        visibleCount,
        sentinelRef,
        hasMore: visibleCount < totalCount,
    };
}
