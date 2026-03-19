"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    getLocaleForTimezone,
    fmtDate, fmtDateShort, fmtDateLong,
    fmtTime, fmtTime12,
    fmtDateTime, fmtDateTimeShort,
    fmtRelative, fmtPresence,
    isTodayTz, isYesterdayTz,
    fmtMonthYear, fmtMonthShort, fmtDateWithDay, dateKeyTz,
} from "@/lib/date-utils";

// ── Context ─────────────────────────────────────────────────────────────────

interface TimezoneContextType {
    timezone: string;
    locale: string;
}

const TimezoneContext = createContext<TimezoneContextType>({
    timezone: "UTC",
    locale: "en-US",
});

// ── Provider ────────────────────────────────────────────────────────────────

export function TimezoneProvider({
    children,
    userTimezone,
    onDetected,
}: {
    children: React.ReactNode;
    userTimezone?: string;
    /** Called once with the browser-detected timezone if the user has none stored */
    onDetected?: (tz: string) => void;
}) {
    // Start with user's stored timezone (or UTC) — matches server render
    const [timezone, setTimezone] = useState(userTimezone || "UTC");
    const locale = useMemo(() => getLocaleForTimezone(timezone), [timezone]);

    // Auto-detect browser timezone if user hasn't set one
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!userTimezone) {
            try {
                const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (detected && detected !== "UTC") {
                    setTimezone(detected);
                    onDetected?.(detected);
                }
            } catch { /* noop */ }
        }
    }, [userTimezone, onDetected]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const value = useMemo(() => ({ timezone, locale }), [timezone, locale]);

    return (
        <TimezoneContext.Provider value={value}>
            {children}
        </TimezoneContext.Provider>
    );
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Get raw timezone + locale strings */
export function useTimezone() {
    return useContext(TimezoneContext);
}

/** Pre-bound date formatting functions using the user's timezone */
export function useDateFormat() {
    const { timezone: tz, locale: loc } = useTimezone();

    return useMemo(() => ({
        /** "Mar 10, 2026" */
        date:          (d: string | Date | undefined) => fmtDate(d, tz, loc),
        /** "10 Mar" */
        dateShort:     (d: string | Date | undefined) => fmtDateShort(d, tz, loc),
        /** "March 10, 2026" */
        dateLong:      (d: string | Date | undefined) => fmtDateLong(d, tz, loc),
        /** "14:30" */
        time:          (d: string | Date | undefined) => fmtTime(d, tz),
        /** "2:30 PM" */
        time12:        (d: string | Date | undefined) => fmtTime12(d, tz, loc),
        /** "Mar 10, 2026, 2:30 PM" */
        dateTime:      (d: string | Date | undefined) => fmtDateTime(d, tz, loc),
        /** "10 Mar 14:30" */
        dateTimeShort: (d: string | Date | undefined) => fmtDateTimeShort(d, tz, loc),
        /** "2h ago" */
        relative:      (d: string | Date | undefined) => fmtRelative(d),
        /** "Online" / "5m ago" */
        presence:      (d: string | Date | undefined) => fmtPresence(d, tz, loc),
        /** true if date is today */
        isToday:       (d: string | Date) => isTodayTz(d, tz),
        /** true if date is yesterday */
        isYesterday:   (d: string | Date) => isYesterdayTz(d, tz),
        /** "March 2026" */
        monthYear:     (d: string | Date | undefined) => fmtMonthYear(d, tz, loc),
        /** "Mar" */
        monthShort:    (d: string | Date | undefined) => fmtMonthShort(d, tz, loc),
        /** "Mon, Mar 10, 2026" */
        dateWithDay:   (d: string | Date | undefined) => fmtDateWithDay(d, tz, loc),
        /** "2026-03-10" — ISO date key in user's timezone */
        dateKey:       (d: string | Date) => dateKeyTz(d, tz),
        /** Raw timezone string */
        timezone: tz,
        /** Raw locale string */
        locale: loc,
    }), [tz, loc]);
}
