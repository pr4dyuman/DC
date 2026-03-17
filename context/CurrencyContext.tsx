"use client";

import { createContext, useContext, useMemo } from "react";
import { formatCurrency, getCurrencyInfo, type CurrencyInfo } from "@/lib/currency";

// ── Context ─────────────────────────────────────────────────────────────────

interface CurrencyContextType {
    /** ISO 4217 currency code, e.g. "USD" */
    currency: string;
    /** Currency info (symbol, locale, name) */
    info: CurrencyInfo;
}

const CurrencyContext = createContext<CurrencyContextType>({
    currency: "USD",
    info: getCurrencyInfo("USD"),
});

// ── Provider ────────────────────────────────────────────────────────────────

export function CurrencyProvider({
    children,
    currency,
}: {
    children: React.ReactNode;
    currency: string;
}) {
    const value = useMemo(() => ({
        currency,
        info: getCurrencyInfo(currency),
    }), [currency]);

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
}

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Get the raw currency code and info */
export function useCurrencyInfo() {
    return useContext(CurrencyContext);
}

/** Pre-bound currency formatting using the agency's currency */
export function useCurrency() {
    const { currency: code, info } = useCurrencyInfo();

    return useMemo(() => ({
        /** Full Intl-formatted string: "$1,234" / "₹1,23,456" */
        format: (amount: number | undefined | null) => formatCurrency(amount, code),
        /** Compact: "$1.2K" */
        formatCompact: (amount: number | undefined | null) => formatCurrency(amount, code, true),
        /** Just the symbol: "$", "₹", "€" */
        symbol: info.symbol,
        /** The ISO code: "USD", "INR" */
        code,
        /** The locale string used for formatting */
        locale: info.locale,
    }), [code, info]);
}
