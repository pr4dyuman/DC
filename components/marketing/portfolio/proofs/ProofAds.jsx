import { formatComparisonValue, percentChange } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import ProofStage from "./ProofStage";

function AdMock({ ad, platform, compact }) {
  return (
    <figure className={`rounded-md bg-[#f7f7f2] text-[#1c1c18] ${compact ? "p-3 sm:p-3.5" : "p-5 sm:p-6"}`}>
      <figcaption className="sr-only">{platform} ad as shown in search results</figcaption>
      <div className="flex items-center gap-2">
        <span className={`${compact ? "h-5 w-5" : "h-8 w-8"} shrink-0 rounded-full bg-[#1c1c18]`} aria-hidden="true" />
        <div className="min-w-0 leading-tight">
          <p className={`${compact ? "text-[9px]" : "text-xs"} font-bold`}>Sponsored</p>
          <p className={`truncate ${compact ? "text-[9px]" : "text-xs"} text-black/55`}>{ad.url}</p>
        </div>
      </div>
      <p className={`mt-2 text-[#2b44c9] ${compact ? "line-clamp-2 text-[12px] leading-snug" : "text-lg leading-snug"}`}>
        {ad.headline}
      </p>
      <p className={`mt-1 text-black/65 ${compact ? "line-clamp-2 text-[10px] leading-4" : "text-sm leading-6"}`}>
        {ad.description}
      </p>
      {!compact && ad.sitelinks?.length ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#2b44c9]">
          {ad.sitelinks.map((link) => (
            <li key={link}>{link}</li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

function ComparisonBars({ comparisons, compact, columns = false }) {
  return (
    <div className={compact ? "space-y-4" : columns ? "grid gap-8 lg:grid-cols-2 lg:gap-12" : "space-y-8"}>
      {comparisons.map((comparison) => {
        const max = Math.max(comparison.before, comparison.after) || 1;
        const change = percentChange(comparison.before, comparison.after);
        const improved = comparison.lowerIsBetter ? change < 0 : change > 0;
        const rows = [
          { label: "Before", value: comparison.before, tone: "bg-white/30" },
          { label: "After", value: comparison.after, tone: "bg-[#F5EE30]" },
        ];

        return (
          <div key={comparison.label}>
            <div className="flex items-baseline justify-between gap-3">
              <p className={`font-bold uppercase tracking-[0.16em] text-white/75 ${compact ? "text-[10px]" : "text-xs"}`}>
                {comparison.label}
              </p>
              <p className={`font-bold tabular-nums ${improved ? "text-[#F5EE30]" : "text-white/60"} ${compact ? "text-xs" : "text-base"}`}>
                {change > 0 ? "+" : "−"}
                {Math.abs(change)}%
              </p>
            </div>
            {rows.map((row) => (
              <div
                key={row.label}
                className={`grid items-center gap-2 ${compact ? "mt-1.5 grid-cols-[2.6rem_minmax(0,1fr)_3.4rem] text-[10px]" : "mt-3 grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] text-sm"}`}
              >
                <span className="text-white/50">{row.label}</span>
                <span className={`block rounded-sm bg-white/[0.06] ${compact ? "h-2.5" : "h-4"}`}>
                  <span
                    className={`reveal-bar block h-full rounded-sm ${row.tone}`}
                    style={{ width: `${(row.value / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-white/85">{formatComparisonValue(row.value, comparison.format)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Ads: the winning ad as people saw it, and the numbers before and after.
// `details: false` leaves out the ad card when the case study page shows the
// ad on a full search results page instead.
export default function ProofAds({ proof, size = "card", sample = false, details = true }) {
  if (size === "large" && !details) {
    return (
      <ProofStage sample={sample}>
        <RevealOnView className="p-5 sm:p-8">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Before and after</p>
          <ComparisonBars comparisons={proof.comparisons} compact={false} columns />
        </RevealOnView>
      </ProofStage>
    );
  }

  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProofStage sample={sample}>
          <div className="flex h-full flex-col justify-center gap-4 p-5 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{proof.platform} · Best-performing ad</p>
            <AdMock ad={proof.ad} platform={proof.platform} compact={false} />
          </div>
        </ProofStage>
        <ProofStage sample={sample}>
          <RevealOnView className="flex h-full flex-col justify-center p-5 sm:p-8">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Before and after</p>
            <ComparisonBars comparisons={proof.comparisons} compact={false} />
          </RevealOnView>
        </ProofStage>
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="sm:aspect-[16/10]">
      <RevealOnView className="grid h-full content-center gap-4 p-4 pt-12 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:items-center sm:gap-5 sm:p-6">
        <AdMock ad={proof.ad} platform={proof.platform} compact />
        <div className="min-w-0">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{proof.platform}</p>
          <ComparisonBars comparisons={proof.comparisons} compact />
        </div>
      </RevealOnView>
    </ProofStage>
  );
}
