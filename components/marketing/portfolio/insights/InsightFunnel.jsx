import { ChevronRight } from "lucide-react";

import { formatCompactNumber, formatGroupedNumber } from "@/lib/marketing-portfolio-charts";

import InsightPanel from "./InsightPanel";

// Millions read better short (3.4M); smaller numbers keep every digit.
function formatStage(value) {
  return value >= 1_000_000 ? formatCompactNumber(value) : formatGroupedNumber(value);
}

function rate(value, previous) {
  const percent = (value / previous) * 100;
  return percent >= 10 ? Math.round(percent) : Number(percent.toFixed(1));
}

// The steps from first view to result, with the share that made it through
// each step. Boxes are not drawn to scale: the numbers carry the comparison.
export default function InsightFunnel({ insight, sample }) {
  const { stages } = insight;
  const last = stages.length - 1;

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <ol className="flex flex-1 flex-col gap-2 md:flex-row md:items-stretch">
        {stages.map((stage, index) => (
          <li key={stage.label} className="flex flex-1 flex-col md:flex-row md:items-center">
            {index > 0 ? (
              <span className="flex items-center justify-center py-1 text-[#F5EE30] md:px-1 md:py-0" aria-hidden="true">
                <ChevronRight className="h-5 w-5 rotate-90 md:rotate-0" />
              </span>
            ) : null}
            <div
              className={`flex flex-1 flex-col justify-between rounded-lg border p-4 sm:p-5 ${
                index === last ? "border-[#F5EE30] bg-[#F5EE30]/[0.08]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{stage.label}</p>
              <p className={`mt-3 text-3xl font-bold tabular-nums ${index === last ? "text-[#F5EE30]" : "text-white"}`}>
                {formatStage(stage.value)}
              </p>
              {index > 0 ? (
                <p className="mt-2 text-xs text-white/55">
                  <span className="font-bold text-white/85">{rate(stage.value, stages[index - 1].value)}%</span> of{" "}
                  {stages[index - 1].label.toLowerCase()}
                </p>
              ) : (
                <p className="mt-2 text-xs text-white/40">Starting point</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </InsightPanel>
  );
}
