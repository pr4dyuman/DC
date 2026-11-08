import { formatCompactNumber } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

const COLORS = ["#F5EE30", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.32)", "#9AA9FF", "#5FD3A8"];

// One total broken into its parts, as a single bar and a list.
export default function InsightSplit({ insight, sample }) {
  const { parts } = insight;
  const sum = parts.reduce((total, part) => total + part.value, 0);

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView className="flex flex-1 flex-col justify-center">
        <p className="font-suifak text-6xl leading-none text-white">{insight.total}</p>
        <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
          {parts.map((part, index) => (
            <span
              key={part.label}
              className="reveal-bar h-full border-r-2 border-[#050505] last:border-r-0"
              style={{ width: `${(part.value / sum) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}
            />
          ))}
        </div>
        <ul className="mt-5 divide-y divide-white/10">
          {parts.map((part, index) => (
            <li key={part.label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2.5 text-white/85">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                <span className="truncate">{part.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-bold text-white">{formatCompactNumber(part.value)}</span>
                <span className="text-white/45"> · {Math.round((part.value / sum) * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </RevealOnView>
    </InsightPanel>
  );
}
