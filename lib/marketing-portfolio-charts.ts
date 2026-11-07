/**
 * Pure helpers for the portfolio's charts and numbers. Every chart is drawn to
 * one linear scale that starts at zero, so a line or bar is never exaggerated.
 */

export type ChartPadding = { top: number; right: number; bottom: number; left: number };

export type ChartScale = { top: number; step: number; ticks: number[] };

/** A round axis maximum with 3 to 6 steps, as close above `maxValue` as possible. */
export function niceScale(maxValue: number, minSteps = 3, maxSteps = 6): ChartScale {
    if (!Number.isFinite(maxValue) || maxValue <= 0) {
        return { top: 1, step: 1, ticks: [0, 1] };
    }

    const exponent = Math.floor(Math.log10(maxValue));
    let best: { top: number; step: number; count: number } | null = null;

    for (let power = exponent - 2; power <= exponent + 1; power += 1) {
        for (const multiplier of [1, 2, 2.5, 5]) {
            const step = multiplier * 10 ** power;
            const count = Math.ceil(maxValue / step - 1e-9);
            if (count < minSteps || count > maxSteps) {
                continue;
            }

            const top = count * step;
            if (!best || top < best.top || (top === best.top && count < best.count)) {
                best = { top, step, count };
            }
        }
    }

    if (!best) {
        return { top: maxValue, step: maxValue / 4, ticks: [0, 1, 2, 3, 4].map((tick) => (tick * maxValue) / 4) };
    }

    return {
        top: best.top,
        step: best.step,
        ticks: Array.from({ length: best.count + 1 }, (_, index) => Number((index * best.step).toPrecision(12))),
    };
}

/** 4120 → "4.1k", 1200000 → "1.2M", 950 → "950". */
export function formatCompactNumber(value: number) {
    const abs = Math.abs(value);
    const trim = (number: number) => String(Number(number.toFixed(1)));

    if (abs >= 1_000_000) {
        return `${trim(value / 1_000_000)}M`;
    }
    if (abs >= 1_000) {
        return `${trim(value / 1_000)}k`;
    }
    return trim(value);
}

export function formatGroupedNumber(value: number) {
    return new Intl.NumberFormat("en-IN").format(value);
}

export type ComparisonFormat = "inr" | "number" | "percent" | "multiplier";

export function formatComparisonValue(value: number, format: ComparisonFormat) {
    switch (format) {
        case "inr":
            return `₹${formatGroupedNumber(value)}`;
        case "percent":
            return `${formatGroupedNumber(value)}%`;
        case "multiplier":
            return `${formatGroupedNumber(value)}×`;
        default:
            return formatGroupedNumber(value);
    }
}

/**
 * Average share of a video watched, from audience retention points (seconds
 * and percent still watching): the area under the curve over the length.
 */
export function averageWatchedPercent(points: Array<{ second: number; percent: number }>) {
    if (points.length < 2) {
        return points[0]?.percent ?? 0;
    }
    let area = 0;
    for (let index = 1; index < points.length; index += 1) {
        const width = points[index].second - points[index - 1].second;
        area += (width * (points[index].percent + points[index - 1].percent)) / 2;
    }
    return Math.round(area / (points[points.length - 1].second - points[0].second));
}

/** Percentage change from before to after, rounded: 640 → 210 is -67. */
export function percentChange(before: number, after: number) {
    if (!before) {
        return 0;
    }
    return Math.round(((after - before) / before) * 100);
}

export type LineChart = {
    points: Array<{ x: number; y: number; value: number }>;
    line: string;
    area: string;
    ticks: Array<{ value: number; y: number; label: string }>;
    plot: { left: number; right: number; top: number; bottom: number };
};

/** Line and area paths for `values` inside a width × height drawing, on a zero-based nice scale. */
export function buildLineChart(values: number[], width: number, height: number, padding: ChartPadding): LineChart {
    const plot = {
        left: padding.left,
        right: width - padding.right,
        top: padding.top,
        bottom: height - padding.bottom,
    };
    const scale = niceScale(Math.max(...values, 0));
    const xAt = (index: number) =>
        values.length === 1 ? plot.left : plot.left + (index * (plot.right - plot.left)) / (values.length - 1);
    const yAt = (value: number) => plot.bottom - (value / scale.top) * (plot.bottom - plot.top);
    const round = (number: number) => Math.round(number * 10) / 10;

    const points = values.map((value, index) => ({ x: round(xAt(index)), y: round(yAt(value)), value }));
    const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
    const area = points.length
        ? `${line} L${points[points.length - 1].x} ${plot.bottom} L${points[0].x} ${plot.bottom} Z`
        : "";

    return {
        points,
        line,
        area,
        ticks: scale.ticks.map((value) => ({ value, y: round(yAt(value)), label: formatCompactNumber(value) })),
        plot,
    };
}

export type ParsedKpi = {
    prefix: string;
    number: number;
    decimals: number;
    grouped: boolean;
    /** en-IN groups as 1,23,456 and en-US as 123,456: keep whichever the value uses. */
    locale: "en-IN" | "en-US";
    suffix: string;
};

/** Splits "+402%" into prefix "+", 402 and suffix "%". Returns null for values like "0:30". */
export function parseKpiValue(value: string): ParsedKpi | null {
    const match = /^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)([^0-9]*)$/.exec(value.trim());
    if (!match) {
        return null;
    }

    const [, prefix, digits, suffix] = match;
    const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
    const number = Number(digits.replace(/,/g, ""));
    const grouped = digits.includes(",");
    const usStyle = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(number);
    return {
        prefix,
        number,
        decimals,
        grouped,
        locale: grouped && usStyle !== digits ? "en-IN" : "en-US",
        suffix,
    };
}

export function formatParsedKpi(parsed: ParsedKpi, number: number) {
    const digits = new Intl.NumberFormat(parsed.locale, {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
        useGrouping: parsed.grouped,
    }).format(number);
    return `${parsed.prefix}${digits}${parsed.suffix}`;
}
