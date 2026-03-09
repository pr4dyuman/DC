// ─── Centralized timezone-aware date formatting ─────────────────────────────
// All date display should go through these functions.
// Dates are stored in UTC (ISO strings). These functions convert to the
// user's timezone for display using the native Intl.DateTimeFormat API.

// ── Timezone → Locale mapping ───────────────────────────────────────────────

const TZ_LOCALE: Record<string, string> = {
    // India
    'Asia/Kolkata': 'en-IN',
    'Asia/Colombo': 'en-IN',
    // US
    'America/New_York': 'en-US',
    'America/Chicago': 'en-US',
    'America/Denver': 'en-US',
    'America/Los_Angeles': 'en-US',
    'America/Phoenix': 'en-US',
    'America/Anchorage': 'en-US',
    'Pacific/Honolulu': 'en-US',
    // UK / Ireland
    'Europe/London': 'en-GB',
    'Europe/Dublin': 'en-IE',
    // Europe
    'Europe/Berlin': 'de-DE',
    'Europe/Paris': 'fr-FR',
    'Europe/Madrid': 'es-ES',
    'Europe/Rome': 'it-IT',
    'Europe/Amsterdam': 'nl-NL',
    'Europe/Stockholm': 'sv-SE',
    'Europe/Oslo': 'nb-NO',
    'Europe/Istanbul': 'tr-TR',
    'Europe/Moscow': 'ru-RU',
    'Europe/Warsaw': 'pl-PL',
    'Europe/Zurich': 'de-CH',
    'Europe/Vienna': 'de-AT',
    'Europe/Lisbon': 'pt-PT',
    'Europe/Athens': 'el-GR',
    // Middle East
    'Asia/Dubai': 'en-AE',
    'Asia/Riyadh': 'ar-SA',
    'Asia/Jerusalem': 'he-IL',
    // Asia-Pacific
    'Asia/Tokyo': 'ja-JP',
    'Asia/Shanghai': 'zh-CN',
    'Asia/Hong_Kong': 'zh-HK',
    'Asia/Singapore': 'en-SG',
    'Asia/Seoul': 'ko-KR',
    'Asia/Bangkok': 'th-TH',
    'Asia/Jakarta': 'id-ID',
    'Asia/Manila': 'en-PH',
    'Asia/Karachi': 'en-PK',
    // Oceania
    'Australia/Sydney': 'en-AU',
    'Australia/Melbourne': 'en-AU',
    'Pacific/Auckland': 'en-NZ',
    // Americas
    'America/Toronto': 'en-CA',
    'America/Vancouver': 'en-CA',
    'America/Mexico_City': 'es-MX',
    'America/Sao_Paulo': 'pt-BR',
    'America/Buenos_Aires': 'es-AR',
    // Africa
    'Africa/Johannesburg': 'en-ZA',
    'Africa/Lagos': 'en-NG',
    'Africa/Cairo': 'ar-EG',
    'Africa/Nairobi': 'en-KE',
};

export function getLocaleForTimezone(tz: string): string {
    if (TZ_LOCALE[tz]) return TZ_LOCALE[tz];
    // Region-based fallback
    if (tz.startsWith('America/')) return 'en-US';
    if (tz.startsWith('Europe/')) return 'en-GB';
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'en-AU';
    return 'en-US';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toDate(d: string | Date | undefined): Date {
    if (!d) return new Date(NaN);
    return typeof d === 'string' ? new Date(d) : d;
}

function safe(fn: () => string, fallback = '—'): string {
    try {
        const result = fn();
        return result === 'Invalid Date' ? fallback : result;
    } catch {
        return fallback;
    }
}

// ── Display formatters ──────────────────────────────────────────────────────

/** "Mar 10, 2026" — medium date */
export function fmtDate(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: tz,
    }));
}

/** "10 Mar" or "Mar 10" — short date without year */
export function fmtDateShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        day: 'numeric', month: 'short', timeZone: tz,
    }));
}

/** "March 10, 2026" — long date */
export function fmtDateLong(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: tz,
    }));
}

/** "14:30" — 24-hour time (consistent colon separator via en-GB) */
export function fmtTime(date: string | Date | undefined, tz: string): string {
    return safe(() => toDate(date).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    }));
}

/** "2:30 PM" — 12-hour time */
export function fmtTime12(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleTimeString(locale, {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
    }));
}

/** "Mar 10, 2026, 2:30 PM" — date + time */
export function fmtDateTime(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleString(locale, {
        dateStyle: 'medium', timeStyle: 'short', timeZone: tz,
    }));
}

/** "10 Mar 14:30" — compact date + 24h time (for chat last-seen) */
export function fmtDateTimeShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleString(locale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: tz,
    }));
}

/** "2h ago", "3d ago" — relative time (timezone-neutral) */
export function fmtRelative(date: string | Date | undefined): string {
    return safe(() => {
        const diff = Date.now() - toDate(date).getTime();
        if (isNaN(diff)) return '—';
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    });
}

/** "Online" / "5m ago" — presence status with Online threshold */
export function fmtPresence(date: string | Date | undefined, tz: string, locale: string): string {
    if (!date) return '';
    return safe(() => {
        const diff = Date.now() - toDate(date).getTime();
        if (isNaN(diff)) return '';
        const mins = Math.floor(diff / 60000);
        if (mins < 5) return 'Online';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return fmtDateShort(date, tz, locale);
    }, '');
}

/** Is the date "today" in the given timezone? */
export function isTodayTz(date: string | Date, tz: string): boolean {
    try {
        const dStr = toDate(date).toLocaleDateString('en-CA', { timeZone: tz });
        const nStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
        return dStr === nStr;
    } catch { return false; }
}

/** Is the date "yesterday" in the given timezone? */
export function isYesterdayTz(date: string | Date, tz: string): boolean {
    try {
        const dStr = toDate(date).toLocaleDateString('en-CA', { timeZone: tz });
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toLocaleDateString('en-CA', { timeZone: tz });
        return dStr === yStr;
    } catch { return false; }
}

/** "March 2026" — month + year */
export function fmtMonthYear(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        month: 'long', year: 'numeric', timeZone: tz,
    }));
}

/** "Mar" — short month name */
export function fmtMonthShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        month: 'short', timeZone: tz,
    }));
}

/** "Mon, Mar 10, 2026" — date with weekday */
export function fmtDateWithDay(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz,
    }));
}

/** "2026-03-10" — ISO date key in the given timezone (for data grouping) */
export function dateKeyTz(date: string | Date, tz: string): string {
    return safe(() => toDate(date).toLocaleDateString('en-CA', { timeZone: tz }));
}

/** Today's date as "YYYY-MM-DD" in the given timezone (for backend comparisons) */
export function todayStrTz(tz: string): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/** "Mon" / "Tue" — short weekday in locale */
export function fmtWeekday(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleDateString(locale, {
        weekday: 'short', timeZone: tz,
    }));
}
