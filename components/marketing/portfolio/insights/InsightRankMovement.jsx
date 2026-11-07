import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

// Google position 1 sits at the right end and 100 at the left, on a log scale,
// so page one (positions 1 to 10) is the right half of every track.
function toPercent(rank) {
  const clamped = Math.min(Math.max(rank ?? 100, 1), 100);
  return (1 - Math.log10(clamped) / 2) * 100;
}

const AXIS = [100, 30, 10, 3, 1];

function summarise(keywords) {
  const ranked = keywords.filter((keyword) => keyword.before !== null);
  const climb = ranked.length
    ? Math.round(ranked.reduce((total, keyword) => total + (keyword.before - keyword.after), 0) / ranked.length)
    : null;

  return [
    {
      label: "On page one",
      value: `${keywords.filter((keyword) => keyword.after <= 10).length} of ${keywords.length}`,
      was: `was ${ranked.filter((keyword) => keyword.before <= 10).length}`,
    },
    {
      label: "In the top three",
      value: String(keywords.filter((keyword) => keyword.after <= 3).length),
      was: `was ${ranked.filter((keyword) => keyword.before <= 3).length}`,
    },
    climb === null ? null : { label: "Average climb", value: `${climb} places`, was: "per ranked term" },
  ].filter(Boolean);
}

export default function InsightRankMovement({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView className="flex flex-1 flex-col">
        <dl className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
          {summarise(insight.keywords).map((item) => (
            <div key={item.label} className="flex flex-col-reverse bg-[#0a0a0a] p-3 sm:p-4">
              <dt className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-white/50">
                {item.label}
                <span className="block font-normal normal-case tracking-normal text-white/35">{item.was}</span>
              </dt>
              <dd className="text-xl font-bold tabular-nums text-[#F5EE30] sm:text-2xl">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="hidden grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem] gap-4 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 sm:grid">
          <span>Search term</span>
          <span className="flex justify-between">
            <span>Before</span>
            <span className="text-[#F5EE30]/80">Page one</span>
          </span>
          <span className="text-right">Change</span>
        </div>
        {/* Rows spread out to match a taller neighbouring panel. */}
        <ul className="flex flex-1 flex-col justify-between">
          {insight.keywords.map((keyword) => {
            const from = toPercent(keyword.before);
            const to = toPercent(keyword.after);
            const change = keyword.before === null ? null : keyword.before - keyword.after;

            return (
              <li
                key={keyword.term}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-white/10 py-3.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/90">{keyword.term}</p>
                  {keyword.volume ? (
                    <p className="text-[11px] text-white/45">{keyword.volume} searches a month</p>
                  ) : null}
                </div>
                <p className="text-right text-sm font-bold tabular-nums text-[#5FD3A8] sm:order-last">
                  {change === null ? "New" : `▲ ${change}`}
                  <span className="sr-only">
                    {keyword.before === null
                      ? `, now position ${keyword.after}, not in the top 100 before`
                      : `, from position ${keyword.before} to ${keyword.after}`}
                  </span>
                </p>
                <div className="relative col-span-2 h-9 sm:col-span-1" aria-hidden="true">
                  <div className="absolute inset-y-1 right-0 w-1/2 rounded-sm border-l border-dashed border-[#F5EE30]/35 bg-[#F5EE30]/[0.06]" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                  <div
                    className="reveal-bar absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-white/25 to-[#F5EE30]"
                    style={{ left: `${from}%`, width: `${to - from}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/50 bg-black"
                    style={{ left: `${from}%` }}
                  />
                  <span
                    className="absolute -top-1 -translate-x-1/2 text-[10px] tabular-nums text-white/50"
                    style={{ left: `${from}%` }}
                  >
                    {keyword.before === null ? "100+" : keyword.before}
                  </span>
                  <span
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5EE30] shadow-[0_0_0_4px_rgba(245,238,48,0.18)]"
                    style={{ left: `${to}%` }}
                  />
                  <span
                    className="absolute -top-1 -translate-x-1/2 text-[11px] font-bold tabular-nums text-[#F5EE30]"
                    style={{ left: `${to}%` }}
                  >
                    #{keyword.after}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="grid grid-cols-[minmax(0,1fr)] border-t border-white/10 pt-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem] sm:gap-4" aria-hidden="true">
          <span className="hidden sm:block" />
          <div className="relative h-4 text-[10px] tabular-nums text-white/40">
            {AXIS.map((rank) => (
              <span
                key={rank}
                className={`absolute ${rank === 100 ? "" : rank === 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                style={{ left: `${toPercent(rank)}%` }}
              >
                {rank === 100 ? "100" : `#${rank}`}
              </span>
            ))}
          </div>
        </div>
      </RevealOnView>
    </InsightPanel>
  );
}
