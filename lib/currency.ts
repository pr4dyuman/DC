// ── Currency data & formatting ──────────────────────────────────────────────

export interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
    locale: string;          // primary locale for Intl formatting
}

/** Comprehensive currency list — sorted by code */
export const CURRENCIES: CurrencyInfo[] = [
    { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
    { code: "AFN", symbol: "؋", name: "Afghan Afghani", locale: "fa-AF" },
    { code: "ALL", symbol: "L", name: "Albanian Lek", locale: "sq-AL" },
    { code: "AMD", symbol: "֏", name: "Armenian Dram", locale: "hy-AM" },
    { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
    { code: "AZN", symbol: "₼", name: "Azerbaijani Manat", locale: "az-AZ" },
    { code: "BAM", symbol: "KM", name: "Bosnia Mark", locale: "bs-BA" },
    { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
    { code: "BGN", symbol: "лв", name: "Bulgarian Lev", locale: "bg-BG" },
    { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar", locale: "ar-BH" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
    { code: "CLP", symbol: "$", name: "Chilean Peso", locale: "es-CL" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
    { code: "COP", symbol: "$", name: "Colombian Peso", locale: "es-CO" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
    { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
    { code: "ETB", symbol: "Br", name: "Ethiopian Birr", locale: "am-ET" },
    { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
    { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
    { code: "GEL", symbol: "₾", name: "Georgian Lari", locale: "ka-GE" },
    { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", locale: "en-GH" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "en-HK" },
    { code: "HRK", symbol: "kn", name: "Croatian Kuna", locale: "hr-HR" },
    { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
    { code: "ILS", symbol: "₪", name: "Israeli Shekel", locale: "he-IL" },
    { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
    { code: "IQD", symbol: "ع.د", name: "Iraqi Dinar", locale: "ar-IQ" },
    { code: "IRR", symbol: "﷼", name: "Iranian Rial", locale: "fa-IR" },
    { code: "ISK", symbol: "kr", name: "Icelandic Króna", locale: "is-IS" },
    { code: "JMD", symbol: "J$", name: "Jamaican Dollar", locale: "en-JM" },
    { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar", locale: "ar-JO" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
    { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
    { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
    { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", locale: "kk-KZ" },
    { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound", locale: "ar-LB" },
    { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", locale: "si-LK" },
    { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham", locale: "ar-MA" },
    { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
    { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
    { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", locale: "ne-NP" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
    { code: "OMR", symbol: "ر.ع.", name: "Omani Rial", locale: "ar-OM" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol", locale: "es-PE" },
    { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
    { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", locale: "en-PK" },
    { code: "PLN", symbol: "zł", name: "Polish Złoty", locale: "pl-PL" },
    { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal", locale: "ar-QA" },
    { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },
    { code: "RSD", symbol: "дин", name: "Serbian Dinar", locale: "sr-RS" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
    { code: "SAR", symbol: "ر.س", name: "Saudi Riyal", locale: "ar-SA" },
    { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
    { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
    { code: "TND", symbol: "د.ت", name: "Tunisian Dinar", locale: "ar-TN" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
    { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", locale: "zh-TW" },
    { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", locale: "sw-TZ" },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", locale: "uk-UA" },
    { code: "UGX", symbol: "USh", name: "Ugandan Shilling", locale: "en-UG" },
    { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
    { code: "UYU", symbol: "$U", name: "Uruguayan Peso", locale: "es-UY" },
    { code: "UZS", symbol: "сўм", name: "Uzbekistani Som", locale: "uz-UZ" },
    { code: "VND", symbol: "₫", name: "Vietnamese Đồng", locale: "vi-VN" },
    { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
    { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha", locale: "en-ZM" },
];

/** Lookup map for fast access */
const CURRENCY_MAP = new Map(CURRENCIES.map(c => [c.code, c]));

/** Get currency info by code. Returns USD as fallback. */
export function getCurrencyInfo(code: string): CurrencyInfo {
    return CURRENCY_MAP.get(code) || CURRENCY_MAP.get("USD")!;
}

/** Get the symbol for a currency code (e.g. "INR" → "₹") */
export function getCurrencySymbol(code: string): string {
    return getCurrencyInfo(code).symbol;
}

/**
 * Format an amount as currency using Intl.NumberFormat.
 * @param amount  - The numeric amount
 * @param code    - ISO 4217 currency code (e.g. "USD", "INR")
 * @param compact - If true, uses compact notation (e.g. "$1.2K")
 */
export function formatCurrency(amount: number | undefined | null, code: string, compact?: boolean): string {
    const info = getCurrencyInfo(code);
    const value = amount ?? 0;
    try {
        return new Intl.NumberFormat(info.locale, {
            style: "currency",
            currency: info.code,
            maximumFractionDigits: 0,
            ...(compact ? { notation: "compact", compactDisplay: "short" } : {}),
        }).format(value);
    } catch {
        // Fallback if locale/currency not supported in this runtime
        return `${info.symbol}${value.toLocaleString()}`;
    }
}

/**
 * Format amount with just the symbol prefix (e.g. "₹1,23,456").
 * Useful for inline display where Intl formatting is overkill.
 */
export function formatWithSymbol(amount: number | undefined | null, code: string): string {
    const info = getCurrencyInfo(code);
    const value = amount ?? 0;
    try {
        return new Intl.NumberFormat(info.locale, {
            maximumFractionDigits: 0,
        }).format(value).replace(/^/, info.symbol);
    } catch {
        return `${info.symbol}${value.toLocaleString()}`;
    }
}
