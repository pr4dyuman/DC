import { buildLineChart, formatCompactNumber, formatGroupedNumber } from "@/lib/marketing-portfolio-charts";

const TEXT = "rgba(255,255,255,0.45)";

// Two monthly series on one chart, each on its own zero-based scale: the main
// series (left axis, filled) and a second one (right axis, line only).
// Numbered markers flag when each step of the work happened.
export default function DualLineChartSvg({
  id,
  primary,
  secondary,
  markers = [],
  width,
  height,
  padding,
  fontSize = 14,
  xLabels = "all",
  className = "block h-auto w-full",
}) {
  const main = buildLineChart(primary.points.map((point) => point.value), width, height, padding);
  const other = buildLineChart(secondary.points.map((point) => point.value), width, height, padding);
  const last = main.points[main.points.length - 1];
  const otherLast = other.points[other.points.length - 1];
  const gradientId = `dual-fill-${id}`;
  const labelIndexes =
    xLabels === "all"
      ? primary.points.map((_, index) => index)
      : [...new Set([0, ...markers.map((marker) => marker.index), primary.points.length - 1])];
  const description = `${primary.label} from ${formatGroupedNumber(main.points[0].value)} to ${formatGroupedNumber(
    last.value,
  )}, and ${secondary.label.toLowerCase()} from ${formatGroupedNumber(other.points[0].value)} to ${formatGroupedNumber(
    otherLast.value,
  )}, ${primary.points[0].label} to ${primary.points[primary.points.length - 1].label}.`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={description}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary.color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={primary.color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {main.ticks.map((tick) => (
        <g key={`l-${tick.value}`}>
          <line x1={main.plot.left} x2={main.plot.right} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.08)" />
          <text x={main.plot.left - 10} y={tick.y + fontSize * 0.35} textAnchor="end" fontSize={fontSize} fill={primary.color} fillOpacity="0.7">
            {tick.label}
          </text>
        </g>
      ))}
      {other.ticks.map((tick) => (
        <text
          key={`r-${tick.value}`}
          x={other.plot.right + 10}
          y={tick.y + fontSize * 0.35}
          textAnchor="start"
          fontSize={fontSize}
          fill={secondary.color}
          fillOpacity="0.75"
        >
          {formatCompactNumber(tick.value)}
        </text>
      ))}

      {markers.map((marker) => {
        const point = main.points[marker.index];
        if (!point) return null;
        return (
          <g key={marker.label} className="reveal-fade">
            <line
              x1={point.x}
              x2={point.x}
              y1={main.plot.top - 6}
              y2={main.plot.bottom}
              stroke="#F5EE30"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            <circle cx={point.x} cy={main.plot.top - 22} r={fontSize * 1.05} fill="#F5EE30" />
            <text x={point.x} y={main.plot.top - 22 + fontSize * 0.36} textAnchor="middle" fontSize={fontSize * 0.95} fontWeight="700" fill="#000">
              {marker.label}
            </text>
          </g>
        );
      })}

      <path
        d={other.line}
        pathLength="1"
        fill="none"
        stroke={secondary.color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="reveal-line"
      />
      <path d={main.area} fill={`url(#${gradientId})`} className="reveal-fade" />
      <path
        d={main.line}
        pathLength="1"
        fill="none"
        stroke={primary.color}
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="reveal-line"
      />

      <g className="reveal-fade">
        <circle cx={otherLast.x} cy={otherLast.y} r="5" fill={secondary.color} />
        <circle cx={last.x} cy={last.y} r="11" fill={primary.color} fillOpacity="0.18" />
        <circle cx={last.x} cy={last.y} r="5.5" fill={primary.color} />
        <text x={last.x - 14} y={last.y + fontSize * 1.6} textAnchor="end" fontSize={fontSize * 1.1} fontWeight="700" fill="#fff">
          {formatGroupedNumber(last.value)}
        </text>
      </g>

      {labelIndexes.map((index) => (
        <text
          key={index}
          x={main.points[index].x}
          y={height - padding.bottom + fontSize * 2}
          textAnchor={index === 0 ? "start" : index === primary.points.length - 1 ? "end" : "middle"}
          fontSize={fontSize}
          fill={TEXT}
        >
          {primary.points[index].label}
        </text>
      ))}
    </svg>
  );
}
