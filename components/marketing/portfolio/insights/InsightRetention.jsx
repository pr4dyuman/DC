import { averageWatchedPercent } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";


function timestamp(second) {
  return `0:${String(second).padStart(2, "0")}`;
}

// Audience retention: the share of viewers still watching at each second,
// with the opening hook shaded and the average marked.
function RetentionSvg({ insight, width, height, padding, fontSize, tickEvery, className }) {
  const { points, hook } = insight;
  const end = points[points.length - 1].second;
  const plot = { left: padding.left, right: width - padding.right, top: padding.top, bottom: height - padding.bottom };
  const x = (second) => plot.left + (second / end) * (plot.right - plot.left);
  const y = (percent) => plot.bottom - (percent / 100) * (plot.bottom - plot.top);
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(point.second).toFixed(1)} ${y(point.percent).toFixed(1)}`).join(" ");
  const area = `${line} L${x(end)} ${plot.bottom} L${x(0)} ${plot.bottom} Z`;
  const average = averageWatchedPercent(points);
  const atHook = points.find((point) => point.second === hook.until)?.percent;
  const last = points[points.length - 1];
  const gradientId = `retention-${width}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`${atHook}% of viewers were still watching after ${hook.until} seconds and ${last.percent}% watched to the end. On average, viewers watched ${average}% of the film.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5EE30" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#F5EE30" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x(0)} y={plot.top} width={x(hook.until) - x(0)} height={plot.bottom - plot.top} fill="#F5EE30" fillOpacity="0.1" />
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.08)" />
          <text x={plot.left - 10} y={y(tick) + fontSize * 0.35} textAnchor="end" fontSize={fontSize} fill="rgba(255,255,255,0.5)">
            {tick}%
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradientId})`} className="reveal-fade" />
      <path d={line} pathLength="1" fill="none" stroke="#F5EE30" strokeWidth="3.5" strokeLinejoin="round" className="reveal-line" />

      <g className="reveal-fade">
        <text x={x(hook.until) + 8} y={plot.top + fontSize * 1.1} fontSize={fontSize} fontWeight="700" fill="#F5EE30">
          {hook.label}
        </text>
        <text x={x(hook.until) + 8} y={plot.top + fontSize * 2.4} fontSize={fontSize * 0.95} fill="rgba(255,255,255,0.75)">
          {atHook}% still watching at {timestamp(hook.until)}
        </text>
        <line x1={plot.left} x2={plot.right} y1={y(average)} y2={y(average)} stroke="#fff" strokeOpacity="0.55" strokeDasharray="6 6" />
        <text x={plot.right} y={y(average) - 8} textAnchor="end" fontSize={fontSize * 0.95} fontWeight="700" fill="#fff">
          Average watched {average}%
        </text>
        <circle cx={x(end)} cy={y(last.percent)} r="5" fill="#F5EE30" />
        <text x={x(end) - 10} y={y(last.percent) + fontSize * 1.5} textAnchor="end" fontSize={fontSize * 0.95} fill="rgba(255,255,255,0.75)">
          {last.percent}% to the end
        </text>
      </g>

      {Array.from({ length: Math.floor(end / tickEvery) + 1 }, (_, index) => index * tickEvery).map((second) => (
        <text
          key={second}
          x={x(second)}
          y={height - padding.bottom + fontSize * 2}
          textAnchor={second === 0 ? "start" : second === end ? "end" : "middle"}
          fontSize={fontSize}
          fill="rgba(255,255,255,0.5)"
        >
          {timestamp(second)}
        </text>
      ))}
    </svg>
  );
}

export default function InsightRetention({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView>
        <RetentionSvg
          insight={insight}
          width={960}
          height={340}
          padding={{ top: 26, right: 24, bottom: 44, left: 56 }}
          fontSize={14}
          tickEvery={5}
          className="hidden h-auto w-full sm:block"
        />
        <RetentionSvg
          insight={insight}
          width={420}
          height={320}
          padding={{ top: 26, right: 14, bottom: 44, left: 48 }}
          fontSize={14}
          tickEvery={10}
          className="block h-auto w-full sm:hidden"
        />
      </RevealOnView>
    </InsightPanel>
  );
}
