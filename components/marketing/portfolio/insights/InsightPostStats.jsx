import Image from "next/image";
import { Bookmark, Heart, MessageCircle, Play, Send } from "lucide-react";

import InsightPanel from "./InsightPanel";

const ICONS = { likes: Heart, comments: MessageCircle, shares: Send, saves: Bookmark };

// One standout post or reel: the cover in a phone-shaped frame and its numbers.
export default function InsightPostStats({ insight, sample }) {
  const { image, caption, headline, stats } = insight;

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <div className="grid flex-1 grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[12.5rem] overflow-hidden rounded-[1.4rem] border border-white/15 bg-black shadow-[0_30px_70px_-40px_rgba(245,238,48,0.55)]">
          <Image src={image.src} alt={image.alt} fill sizes="12.5rem" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" aria-hidden="true" />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            Reel
          </span>
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white" aria-hidden="true">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
          <p className="absolute inset-x-3 bottom-3 text-xs font-bold leading-4 text-white">{caption}</p>
        </div>

        <div>
          <p className="font-suifak text-6xl leading-none text-[#F5EE30]">{headline.value}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/80">{headline.label}</p>
          <dl className="mt-6 grid grid-cols-2 gap-2.5">
            {stats.map((stat) => {
              const Icon = ICONS[stat.label] || Heart;
              return (
                <div key={stat.label} className="flex flex-col-reverse rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <dt className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/55">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {stat.label}
                  </dt>
                  <dd className="text-xl font-bold tabular-nums text-white">{stat.value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </InsightPanel>
  );
}
