import { formatCompactNumber, niceScale } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

function format(value, insight) {
  const number = value >= 10000 ? formatCompactNumber(value) : new Intl.NumberFormat("en-IN").format(value);
  return `${insight.prefix || ""}${number}${insight.suffix || ""}`;
}

// Bars drawn to one zero-based scale: columns for a series over time, or
// horizontal bars when only a few things are being compared.
export default function InsightBars({ insight, sample }) {
  const { bars } = insight;
  const max = Math.max(...bars.map((bar) => bar.value));
  const lastIndex = bars.length - 1;

  if (bars.length <= 3) {
    return (
      <InsightPanel title={insight.title} note={insight.note} sample={sample}>
        <RevealOnView className="flex flex-1 flex-col justify-center gap-5">
          {bars.map((bar, index) => (
            <div key={bar.label}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm text-white/80">{bar.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${index === 0 ? "text-[#F5EE30]" : "text-white/70"}`}>
                  {format(bar.value, insight)}
                </p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                <div
                  className={`reveal-bar h-full rounded-full ${index === 0 ? "bg-[#F5EE30]" : "bg-white/35"}`}
                  style={{ width: `${(bar.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </RevealOnView>
      </InsightPanel>
    );
  }

  const scale = niceScale(max);

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView className="flex flex-1 flex-col justify-end">
        <ul className="relative grid h-56 items-end gap-2 border-b border-white/15 sm:h-64 sm:gap-4" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((bar, index) => (
            <li key={bar.label} className="flex h-full flex-col justify-end">
              <span className={`mb-1.5 text-center text-xs font-bold tabular-nums sm:text-sm ${index === lastIndex ? "text-[#F5EE30]" : "text-white/70"}`}>
                {format(bar.value, insight)}
              </span>
              <span
                className={`reveal-rise block rounded-t-md ${index === lastIndex ? "bg-[#F5EE30]" : "bg-white/25"}`}
                style={{ height: `${(bar.value / scale.top) * 85}%` }}
                aria-hidden="true"
              />
              <span className="sr-only">{bar.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }} aria-hidden="true">
          {bars.map((bar) => (
            <span key={bar.label} className="text-center text-xs text-white/50">
              {bar.label}
            </span>
          ))}
        </div>
      </RevealOnView>
    </InsightPanel>
  );
}
