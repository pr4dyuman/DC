import { Check, Phone } from "lucide-react";

import InsightPanel from "./InsightPanel";

// The page an ad leads to, on a phone: the offer, the fee and a short form.
export default function InsightLandingPage({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[17.5rem] rounded-[2rem] border border-white/15 bg-[#0d0d0c] p-2 shadow-[0_30px_70px_-40px_rgba(245,238,48,0.55)]">
          <div className="overflow-hidden rounded-[1.6rem] bg-white text-[#0f2a28]">
            <div className="flex items-center justify-between gap-2 border-b border-black/10 px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-4 w-4 shrink-0 rounded-full bg-[#0f766e]" aria-hidden="true" />
                <span className="truncate text-[10px] font-bold text-black/55">{insight.url}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0f766e] px-2.5 py-1 text-[10px] font-bold text-white">
                <Phone className="h-2.5 w-2.5" aria-hidden="true" />
                Call
              </span>
            </div>
            <div className="bg-[#e3f3ef] px-4 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f766e]">{insight.eyebrow}</p>
              <p className="mt-2 text-lg font-bold leading-snug">{insight.heading}</p>
              <p className="mt-2 text-xs font-bold text-[#0f766e]">{insight.price}</p>
            </div>
            <ul className="space-y-1.5 px-4 py-3.5">
              {insight.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs leading-4">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#0f766e]" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="space-y-2 px-4 pb-5">
              {insight.fields.map((field) => (
                <div key={field} className="rounded-md border border-black/15 px-3 py-2 text-[11px] text-black/45">
                  {field}
                </div>
              ))}
              <div className="rounded-md bg-[#0f766e] px-3 py-2.5 text-center text-xs font-bold text-white">{insight.cta}</div>
            </div>
          </div>
        </div>
      </div>
    </InsightPanel>
  );
}
