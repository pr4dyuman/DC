import Image from "../PortfolioImage";

import InsightPanel from "./InsightPanel";

const RATIO = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1 };

// The same film cut for different screens, each frame in its real shape and
// all at the same height, so the formats compare at a glance.
export default function InsightCuts({ insight, sample }) {
  const { versions } = insight;
  const columns = versions.map((version) => `${RATIO[version.ratio] || 1}fr`).join(" ");

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <div className="grid items-end gap-3" style={{ gridTemplateColumns: columns }}>
        {versions.map((version, index) => (
          <div
            key={version.label}
            className="relative overflow-hidden rounded-md border border-white/15 bg-black"
            style={{ aspectRatio: String(RATIO[version.ratio] || 1) }}
          >
            <Image src={version.image.src} alt={version.image.alt} fill sizes="(min-width: 1024px) 20rem, 45vw" className="object-cover" />
            <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5EE30] px-1 text-[10px] font-bold text-black">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
      <ol className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {versions.map((version, index) => (
          <li key={version.label} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5EE30] text-[10px] font-bold text-black">{index + 1}</span>
            <span className="min-w-0">
              <span className="font-bold text-white">{version.label}</span>
              <span className="text-white/55"> · {version.use}</span>
            </span>
            <span className="text-xs font-bold tabular-nums text-white/50">{version.ratio}</span>
          </li>
        ))}
      </ol>
    </InsightPanel>
  );
}
