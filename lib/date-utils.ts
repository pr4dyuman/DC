// Centralized timezone-aware date formatting.
// All date display should go through these functions.
// Dates may be stored either as full ISO timestamps or as date-only YYYY-MM-DD strings.

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

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateOnlyParts = {
    year: number;
    month: number;
    day: number;
};

export function getLocaleForTimezone(tz: string): string {
    if (TZ_LOCALE[tz]) return TZ_LOCALE[tz];
    if (tz.startsWith('America/')) return 'en-US';
    if (tz.startsWith('Europe/')) return 'en-GB';
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'en-AU';
    return 'en-US';
}

function parseDateOnlyParts(value: string): DateOnlyParts | null {
    const match = DATE_ONLY_RE.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return { year, month, day };
}

function toDateOnlyAnchorUtc(value: string): Date {
    const parts = parseDateOnlyParts(value);
    if (!parts) return new Date(NaN);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

function formatDateKey(date: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
        throw new Error('Invalid date parts');
    }

    return `${year}-${month}-${day}`;
}

function formatCalendarDate(
    date: string | Date | undefined,
    tz: string,
    locale: string,
    options: Intl.DateTimeFormatOptions
): string {
    if (typeof date === 'string' && parseDateOnlyParts(date)) {
        return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(toDateOnlyAnchorUtc(date));
    }

    return new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(toDate(date));
}

function toDate(date: string | Date | undefined): Date {
    if (!date) return new Date(NaN);
    return typeof date === 'string' ? new Date(date) : date;
}

function safe(fn: () => string, fallback = '—'): string {
    try {
        const result = fn();
        return result === 'Invalid Date' ? fallback : result;
    } catch {
        return fallback;
    }
}

export function isDateOnlyString(value: unknown): value is string {
    return typeof value === 'string' && parseDateOnlyParts(value) !== null;
}

export function hasExplicitTime(date: string | Date | undefined | null): boolean {
    if (!date) return false;
    if (date instanceof Date) return true;
    return /[T ]\d{2}:\d{2}/.test(date);
}

export function toLocalCalendarDay(date: string | Date | undefined | null): Date | null {
    if (!date) return null;

    if (typeof date === 'string') {
        const parts = parseDateOnlyParts(date);
        if (parts) {
            return new Date(parts.year, parts.month - 1, parts.day);
        }
    }

    const parsed = date instanceof Date ? new Date(date) : new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

export function fmtDate(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }));
}

export function fmtDateShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        day: 'numeric',
        month: 'short',
    }));
}

export function fmtDateLong(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }));
}

export function fmtTime(date: string | Date | undefined, tz: string): string {
    return safe(() => toDate(date).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
    }));
}

export function fmtTime12(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: tz,
    }));
}

export function fmtDateTime(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleString(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: tz,
    }));
}

export function fmtDateTimeShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => toDate(date).toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
    }));
}

export function fmtRelative(date: string | Date | undefined): string {
    return safe(() => {
        const diff = Date.now() - toDate(date).getTime();
        if (Number.isNaN(diff)) return '—';
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

export function fmtPresence(date: string | Date | undefined, tz: string, locale: string): string {
    if (!date) return '';
    return safe(() => {
        const diff = Date.now() - toDate(date).getTime();
        if (Number.isNaN(diff)) return '';
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

export function isTodayTz(date: string | Date, tz: string): boolean {
    try {
        return dateKeyTz(date, tz) === todayStrTz(tz);
    } catch {
        return false;
    }
}

export function isYesterdayTz(date: string | Date, tz: string): boolean {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return dateKeyTz(date, tz) === dateKeyTz(yesterday, tz);
    } catch {
        return false;
    }
}

export function fmtMonthYear(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        month: 'long',
        year: 'numeric',
    }));
}

export function fmtMonthShort(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        month: 'short',
    }));
}

export function fmtDateWithDay(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }));
}

export function dateKeyTz(date: string | Date, tz: string): string {
    if (typeof date === 'string' && parseDateOnlyParts(date)) return date;
    return safe(() => formatDateKey(toDate(date), tz));
}

export function todayStrTz(tz: string): string {
    return formatDateKey(new Date(), tz);
}

export function fmtWeekday(date: string | Date | undefined, tz: string, locale: string): string {
    return safe(() => formatCalendarDate(date, tz, locale, {
        weekday: 'short',
    }));
}
