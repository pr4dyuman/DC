import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

// Lighthouse's own bands: 90 and up is good, 50 to 89 needs work, under 50 is poor.
function scoreColor(score) {
  if (score >= 90) return "#0CCE6B";
  if (score >= 50) return "#FFA400";
  return "#FF4E42";
}

function Ring({ score, size = 120, stroke = 9 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(score);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-28 w-28 sm:h-32 sm:w-32" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}1f`} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="reveal-fade"
      />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize={size * 0.3} fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

export default function InsightScoreRings({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {insight.scores.map((item) => (
            <li key={item.label} className="flex flex-col items-center text-center">
              <Ring score={item.after} />
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85">{item.label}</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scoreColor(item.before) }} aria-hidden="true" />
                was <span className="font-bold tabular-nums text-white/75">{item.before}</span>
                <span className="sr-only">, now {item.after} out of 100</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/45" aria-hidden="true">
          {[
            ["#FF4E42", "0 – 49"],
            ["#FFA400", "50 – 89"],
            ["#0CCE6B", "90 – 100"],
          ].map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </RevealOnView>
    </InsightPanel>
  );
}
