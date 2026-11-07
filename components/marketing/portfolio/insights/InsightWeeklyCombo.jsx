import { formatCompactNumber, niceScale } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

const LINE = "#F5EE30";
const BAR = "rgba(255,255,255,0.24)";

// Bars for one measure and a line for another, each on its own zero-based
// axis: bars on the left, the line on the right.
function ComboSvg({ insight, width, height, padding, fontSize, everyLabel, className }) {
  const { labels, bars, line } = insight;
  const count = labels.length;
  const plot = { left: padding.left, right: width - padding.right, top: padding.top, bottom: height - padding.bottom };
  const band = (plot.right - plot.left) / count;
  const barScale = niceScale(Math.max(...bars.values));
  const lineScale = niceScale(Math.max(...line.values));
  const x = (index) => plot.left + band * (index + 0.5);
  const yBar = (value) => plot.bottom - (value / barScale.top) * (plot.bottom - plot.top);
  const yLine = (value) => plot.bottom - (value / lineScale.top) * (plot.bottom - plot.top);
  const path = line.values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${yLine(value).toFixed(1)}`).join(" ");
  const prefix = line.prefix || "";
  const first = line.values[0];
  const last = line.values[count - 1];
  const description = `${bars.label} rose from ${bars.values[0]} to ${bars.values[count - 1]} a week while ${line.label.toLowerCase()} fell from ${prefix}${first} to ${prefix}${last}.`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={description}>
      {barScale.ticks.map((tick) => (
        <g key={`b-${tick}`}>
          <line x1={plot.left} x2={plot.right} y1={yBar(tick)} y2={yBar(tick)} stroke="rgba(255,255,255,0.08)" />
          <text x={plot.left - 10} y={yBar(tick) + fontSize * 0.35} textAnchor="end" fontSize={fontSize} fill="rgba(255,255,255,0.5)">
            {formatCompactNumber(tick)}
          </text>
        </g>
      ))}
      {lineScale.ticks.map((tick) => (
        <text key={`l-${tick}`} x={plot.right + 10} y={yLine(tick) + fontSize * 0.35} fontSize={fontSize} fill={LINE} fillOpacity="0.75">
          {prefix}
          {formatCompactNumber(tick)}
        </text>
      ))}

      {bars.values.map((value, index) => (
        <rect
          key={index}
          x={x(index) - band * 0.3}
          y={yBar(value)}
          width={band * 0.6}
          height={plot.bottom - yBar(value)}
          rx="3"
          fill={index === count - 1 ? "rgba(255,255,255,0.5)" : BAR}
          className="reveal-rise"
          style={{ transformBox: "fill-box" }}
        />
      ))}

      <path d={path} pathLength="1" fill="none" stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" className="reveal-line" />
      <g className="reveal-fade">
        <circle cx={x(0)} cy={yLine(first)} r="5" fill={LINE} />
        <text x={x(0) + 10} y={yLine(first) - 12} fontSize={fontSize * 1.05} fontWeight="700" fill="#fff">
          {prefix}
          {first}
        </text>
        <circle cx={x(count - 1)} cy={yLine(last)} r="10" fill={LINE} fillOpacity="0.2" />
        <circle cx={x(count - 1)} cy={yLine(last)} r="5" fill={LINE} />
        <text x={x(count - 1)} y={yLine(last) - 16} textAnchor="end" fontSize={fontSize * 1.05} fontWeight="700" fill="#fff">
          {prefix}
          {last}
        </text>
      </g>

      {labels.map((label, index) =>
        label && (everyLabel || index === 0 || index === count - 1 || label) ? (
          <text key={index} x={x(index)} y={height - padding.bottom + fontSize * 2} textAnchor="middle" fontSize={fontSize} fill="rgba(255,255,255,0.5)">
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export default function InsightWeeklyCombo({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
          <li className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-white/30" aria-hidden="true" />
            {insight.bars.label} per week
          </li>
          <li className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-[#F5EE30]" aria-hidden="true" />
            {insight.line.label}
          </li>
        </ul>
        <ComboSvg
          insight={insight}
          width={960}
          height={360}
          padding={{ top: 36, right: 64, bottom: 44, left: 44 }}
          fontSize={14}
          everyLabel
          className="mt-4 hidden h-auto w-full sm:block"
        />
        <ComboSvg
          insight={insight}
          width={420}
          height={320}
          padding={{ top: 34, right: 52, bottom: 44, left: 34 }}
          fontSize={14}
          className="mt-4 block h-auto w-full sm:hidden"
        />
      </RevealOnView>
    </InsightPanel>
  );
}
