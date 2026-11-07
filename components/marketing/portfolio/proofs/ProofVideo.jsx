import Image from "next/image";
import { Play } from "lucide-react";

import HoverVideo from "./HoverVideo";
import ProofStage from "./ProofStage";

// Title and length on one line; the channels join them from tablet width up,
// so the text never reaches the play button on a phone.
function Meta({ proof }) {
  return (
    <div className="absolute inset-x-4 bottom-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-bold uppercase tracking-[0.12em] text-white">{proof.title}</p>
        <span className="shrink-0 rounded bg-black/75 px-2 py-1 text-[11px] font-bold tabular-nums text-white">
          {proof.duration}
        </span>
      </div>
      <p className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-white/65 sm:block">
        {proof.channels.join(" · ")}
      </p>
    </div>
  );
}

// Video: the film itself. Cards show the poster and, when a video file is set,
// a muted preview on hover; the case study page plays it with controls.
export default function ProofVideo({ proof, size = "card", sample = false }) {
  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-4">
        <ProofStage sample={sample} samplePosition="bottom" className="aspect-video">
          {proof.video ? (
            <video
              className="absolute inset-0 h-full w-full bg-black object-cover"
              src={proof.video}
              poster={proof.poster.src}
              controls
              playsInline
              preload="none"
            >
              {proof.title}
            </video>
          ) : (
            <>
              <Image
                src={proof.poster.src}
                alt={proof.poster.alt}
                fill
                sizes="(min-width: 1280px) 76rem, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <Meta proof={proof} />
            </>
          )}
        </ProofStage>
        {proof.stills.length ? (
          <ul className="grid grid-cols-3 gap-3">
            {proof.stills.map((still) => (
              <li key={still.src} className="relative aspect-video overflow-hidden rounded-md border border-white/10">
                <Image src={still.src} alt={still.alt} fill sizes="(min-width: 1024px) 24rem, 33vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="aspect-[4/3] sm:aspect-[16/10]">
      <div className="absolute inset-0">
        <Image
          src={proof.poster.src}
          alt={proof.poster.alt}
          fill
          sizes="(min-width: 1024px) 34rem, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {proof.video ? <HoverVideo src={proof.video} /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <span
          className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#F5EE30] text-black shadow-lg transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          <Play className="ml-0.5 h-6 w-6 fill-current" />
        </span>
        <Meta proof={proof} />
      </div>
    </ProofStage>
  );
}
