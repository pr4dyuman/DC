import { buildLineChart, formatGroupedNumber } from "@/lib/marketing-portfolio-charts";

const TEXT = "rgba(255,255,255,0.45)";

// A to-scale line chart (zero baseline) drawn in SVG. Lines draw and labels
// fade in through the .reveal-* classes when wrapped in RevealOnView.
export default function LineChartSvg({
  id,
  points,
  width,
  height,
  padding,
  label,
  fontSize = 14,
  strokeWidth = 3,
  marker,
  xLabels = "ends",
  showTicks = true,
  showEndLabel = true,
  endSuffix = "",
  className = "block h-auto w-full",
}) {
  const chart = buildLineChart(
    points.map((point) => point.value),
    width,
    height,
    padding,
  );
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  const markerPoint = marker && Number.isInteger(marker.index) ? chart.points[marker.index] : null;
  const markerOnRight = markerPoint && markerPoint.x > width * 0.7;

  let labelIndexes = [];
  if (xLabels === "all") {
    labelIndexes = points.map((_, index) => index);
  } else if (xLabels === "ends") {
    labelIndexes = [...new Set([0, marker?.index, points.length - 1].filter((index) => Number.isInteger(index)))];
  }

  const gradientId = `line-fill-${id}`;
  const description =
    label ||
    `${points[0].label} ${formatGroupedNumber(first.value)} to ${points[points.length - 1].label} ${formatGroupedNumber(last.value)}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={description}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5EE30" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F5EE30" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showTicks
        ? chart.ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={chart.plot.left}
                x2={chart.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke="rgba(255,255,255,0.09)"
                strokeWidth="1"
              />
              <text x={chart.plot.left - 12} y={tick.y + fontSize * 0.35} textAnchor="end" fontSize={fontSize} fill={TEXT}>
                {tick.label}
              </text>
            </g>
          ))
        : null}

      {markerPoint ? (
        <g className="reveal-fade">
          <line
            x1={markerPoint.x}
            x2={markerPoint.x}
            y1={chart.plot.top - 6}
            y2={chart.plot.bottom}
            stroke="#F5EE30"
            strokeOpacity="0.75"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />
          <text
            x={markerOnRight ? markerPoint.x - 10 : markerPoint.x + 10}
            y={chart.plot.top + fontSize * 0.4}
            textAnchor={markerOnRight ? "end" : "start"}
            fontSize={fontSize}
            fontWeight="700"
            fill="#F5EE30"
          >
            {marker.label}
          </text>
        </g>
      ) : null}

      <path d={chart.area} fill={`url(#${gradientId})`} className="reveal-fade" />
      <path
        d={chart.line}
        pathLength="1"
        fill="none"
        stroke="#F5EE30"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="reveal-line"
      />

      <g className="reveal-fade">
        <circle cx={last.x} cy={last.y} r={strokeWidth * 3.4} fill="#F5EE30" fillOpacity="0.18" />
        <circle cx={last.x} cy={last.y} r={strokeWidth * 1.6} fill="#F5EE30" />
        {showEndLabel ? (
          <text
            x={last.x - strokeWidth * 4}
            y={last.y - strokeWidth * 3.2}
            textAnchor="end"
            fontSize={fontSize * 1.15}
            fontWeight="700"
            fill="#ffffff"
          >
            {formatGroupedNumber(last.value)}
            {endSuffix}
          </text>
        ) : null}
      </g>

      {labelIndexes.map((index) => (
        <text
          key={index}
          x={chart.points[index].x}
          y={height - padding.bottom + fontSize * 2}
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          fontSize={fontSize}
          fill={TEXT}
        >
          {points[index].label}
        </text>
      ))}
    </svg>
  );
}
