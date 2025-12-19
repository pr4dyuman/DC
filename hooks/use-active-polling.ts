"use client";

import { useEffect, useRef } from "react";

/**
 * A hook that runs a callback at a specified interval, but ONLY when the document is visible.
 * It also runs the callback immediately when the document becomes visible if enough time has passed.
 * 
 * @param callback The function to call
 * @param intervalMs The interval in milliseconds
 * @param isEnabled Whether polling is enabled (default true)
 */
export function useActivePolling(
    callback: () => void,
    intervalMs: number,
    isEnabled: boolean = true
) {
    const savedCallback = useRef(callback);
    const lastRunTime = useRef<number>(Date.now());

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!isEnabled) return;

        const tick = () => {
            if (!document.hidden) {
                savedCallback.current();
                lastRunTime.current = Date.now();
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden && isEnabled) {
                // If user comes back and it's been longer than interval since last run, run immediately
                const now = Date.now();
                if (now - lastRunTime.current > intervalMs) {
                    tick();
                }
            }
        };

        // Set up the interval
        const id = setInterval(tick, intervalMs);

        // Listen for visibility changes
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [intervalMs, isEnabled]);
}
