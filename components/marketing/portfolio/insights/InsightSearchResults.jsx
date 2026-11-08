import { Phone, Search, Star } from "lucide-react";

import InsightPanel from "./InsightPanel";

// Other results are grey placeholder lines, so no real business is shown.
function OtherResult({ lines = 2 }) {
  return (
    <div className="space-y-2 py-3.5" aria-hidden="true">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-black/10" />
        <span className="h-2.5 w-28 rounded-full bg-black/10" />
      </div>
      <div className="h-3.5 w-3/4 rounded-full bg-[#1a0dab]/15" />
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className={`h-2.5 rounded-full bg-black/[0.07] ${index === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[#f2a90e]" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-3 w-3 ${star <= Math.round(rating) ? "fill-current" : ""}`} />
      ))}
    </span>
  );
}

function MapPack({ mapPack }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <svg viewBox="0 0 600 190" className="block h-auto w-full bg-[#e9ece4]" aria-hidden="true">
        <rect x="380" y="0" width="140" height="80" fill="#cfe3c4" />
        <path d="M0 120 L600 96" stroke="#fff" strokeWidth="14" />
        <path d="M150 0 L210 190" stroke="#fff" strokeWidth="10" />
        <path d="M0 40 L600 58" stroke="#fff" strokeWidth="6" />
        <path d="M420 190 L470 0" stroke="#fff" strokeWidth="8" />
        <path d="M0 165 L600 150" stroke="#f6e7a8" strokeWidth="9" />
        {[
          { x: 255, y: 92, label: "A", active: true },
          { x: 470, y: 128, label: "B" },
          { x: 95, y: 58, label: "C" },
        ].map((pin) => (
          <g key={pin.label} transform={`translate(${pin.x} ${pin.y})`}>
            <path
              d="M0 0 C-14 -18 -16 -26 -16 -32 A16 16 0 1 1 16 -32 C16 -26 14 -18 0 0 Z"
              fill={pin.active ? "#F5EE30" : "#9aa0a6"}
              stroke={pin.active ? "#111" : "#fff"}
              strokeWidth="2"
            />
            <text x="0" y="-27" textAnchor="middle" fontSize="15" fontWeight="700" fill={pin.active ? "#111" : "#fff"}>
              {pin.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className="divide-y divide-black/10">
        <li className="flex items-start gap-3 bg-[#fffbd6] px-4 py-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5EE30] text-[11px] font-bold text-black ring-1 ring-black">
            A
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1a0dab]">{mapPack.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-black/60">
              <span className="font-bold text-black/80">{mapPack.rating.toFixed(1)}</span>
              <Stars rating={mapPack.rating} />
              <span>({mapPack.reviews})</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-black/55">{mapPack.detail}</p>
          </div>
        </li>
        {["B", "C"].map((label) => (
          <li key={label} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9aa0a6] text-[11px] font-bold text-white">
              {label}
            </span>
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-40 rounded-full bg-black/10" />
              <div className="h-2 w-24 rounded-full bg-black/[0.07]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClientResult({ result, position, ad }) {
  return (
    <div className="relative -mx-2 rounded-lg bg-[#fffbd6] px-2 py-3.5 ring-2 ring-[#F5EE30] sm:-mx-3 sm:px-3">
      <span className="absolute -top-2.5 right-3 rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5EE30]">
        {ad ? "Top ad" : `Position ${position}`}
      </span>
      {ad ? <p className="text-xs font-bold text-black">Sponsored</p> : null}
      <div className={`flex items-center gap-2 ${ad ? "mt-1.5" : ""}`}>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b2a1e] text-[10px] font-bold text-white" aria-hidden="true">
          {result.siteName.charAt(0)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-bold text-black/80">{result.siteName}</p>
          <p className="truncate text-[11px] text-black/50">{result.url}</p>
        </div>
      </div>
      <p className="mt-2 text-base leading-snug text-[#1a0dab] sm:text-lg">{result.title}</p>
      <p className="mt-1 text-[13px] leading-5 text-black/65">{result.description}</p>
      {ad?.sitelinks?.length ? (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#1a0dab]">
          {ad.sitelinks.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </p>
      ) : null}
      {ad?.call ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-xs font-bold text-[#1a0dab]">
          <Phone className="h-3 w-3" aria-hidden="true" />
          {ad.call}
        </span>
      ) : null}
    </div>
  );
}

// A search results page with the client's listing highlighted: as a paid ad
// at the top, or in the map pack and the organic results.
export default function InsightSearchResults({ insight, sample }) {
  const { query, position, result, mapPack, ad } = insight;
  const organicSlots = Math.max(position + 1, 3);

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <div className="flex-1 rounded-lg bg-white p-4 text-[#202124] shadow-[0_30px_70px_-45px_rgba(245,238,48,0.6)] sm:p-5">
        <div className="flex items-center gap-3 rounded-full border border-black/15 px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-black/45" aria-hidden="true" />
          <span className="truncate text-sm text-black/80">{query}</span>
        </div>
        <div className="mt-3 flex gap-5 border-b border-black/10 text-xs text-black/55" aria-hidden="true">
          {["All", "Maps", "Images", "Shopping"].map((tab, index) => (
            <span key={tab} className={`pb-2 ${index === 0 ? "border-b-2 border-[#1a73e8] font-bold text-[#1a73e8]" : ""}`}>
              {tab}
            </span>
          ))}
        </div>

        <div className="mt-4">
          {ad ? (
            <>
              <ClientResult result={result} position={position} ad={ad} />
              <OtherResult />
              <OtherResult lines={1} />
            </>
          ) : (
            <>
              {mapPack ? <MapPack mapPack={mapPack} /> : null}
              <div className="mt-2">
                {Array.from({ length: organicSlots }, (_, index) =>
                  index + 1 === position ? (
                    <ClientResult key="client" result={result} position={position} />
                  ) : (
                    <OtherResult key={index} lines={index % 2 ? 1 : 2} />
                  ),
                )}
              </div>
            </>
          )}
        </div>
        <p className="sr-only">
          {ad
            ? `${result.siteName}'s ad shows at the top of the results for “${query}”.`
            : `${result.siteName} shows${mapPack ? " first in the map pack and" : ""} at position ${position} for “${query}”.`}
        </p>
      </div>
    </InsightPanel>
  );
}
