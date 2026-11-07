import { formatCompactNumber, formatGroupedNumber } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import InsightPanel from "./InsightPanel";

const AVATAR_COLORS = ["#f6c9b8", "#d9d0ff", "#c9eedc", "#f5e7a1", "#cfe4f7"];

// Each creator's discount code and the sign-ups it brought in, with sign-ups
// per 1,000 followers to show who converted best for their size.
export default function InsightCreatorLeaderboard({ insight, sample }) {
  const creators = insight.creators.map((creator) => ({
    ...creator,
    perThousand: creator.signups / (creator.followers / 1000),
  }));
  const maxSignups = Math.max(...creators.map((creator) => creator.signups));
  const best = Math.max(...creators.map((creator) => creator.perThousand));

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <RevealOnView>
        <div className="hidden grid-cols-[minmax(0,14rem)_8rem_minmax(0,1fr)_7.5rem] gap-5 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 md:grid">
          <span>Creator</span>
          <span>Code</span>
          <span>Sign-ups</span>
          <span className="text-right">Per 1,000 followers</span>
        </div>
        <ol>
          {creators.map((creator, index) => {
            const isBest = creator.perThousand === best;

            return (
              <li
                key={creator.handle}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border-t border-white/10 py-3.5 md:grid-cols-[minmax(0,14rem)_8rem_minmax(0,1fr)_7.5rem] md:gap-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                    style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                    aria-hidden="true"
                  >
                    {creator.initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-bold text-white">{creator.handle}</p>
                    <p className="text-xs text-white/50">{formatCompactNumber(creator.followers)} followers</p>
                  </div>
                </div>
                <span className="justify-self-end rounded-md border border-dashed border-white/25 px-2 py-1 font-mono text-[11px] text-white/80 md:justify-self-start">
                  {creator.code}
                </span>
                <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                    <div className="reveal-bar h-full rounded-full bg-white/45" style={{ width: `${(creator.signups / maxSignups) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-bold tabular-nums text-white">{formatGroupedNumber(creator.signups)}</span>
                </div>
                <p className={`col-span-2 text-sm tabular-nums md:col-span-1 md:text-right ${isBest ? "font-bold text-[#F5EE30]" : "text-white/70"}`}>
                  <span className="md:hidden text-xs font-normal text-white/45">Per 1,000 followers: </span>
                  {creator.perThousand.toFixed(1)}
                  {isBest ? <span className="ml-2 rounded-full bg-[#F5EE30] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black">Best</span> : null}
                </p>
              </li>
            );
          })}
        </ol>
      </RevealOnView>
    </InsightPanel>
  );
}
