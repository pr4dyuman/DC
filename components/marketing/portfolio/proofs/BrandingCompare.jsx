"use client";

import Image from "../PortfolioImage";
import { MoveHorizontal } from "lucide-react";
import { useState } from "react";

import { SampleChip } from "./ProofStage";

// Drag (or use the arrow keys) to compare the old and new identity.
export default function BrandingCompare({ before, after, sample = false }) {
  const [split, setSplit] = useState(50);

  return (
    <figure className="relative aspect-[16/10] select-none overflow-hidden rounded-lg border border-white/10 bg-black has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-[#F5EE30]">
      <Image src={after.src} alt={after.alt} fill sizes="(min-width: 1280px) 76rem, 100vw" className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <Image src={before.src} alt={before.alt} fill sizes="(min-width: 1280px) 76rem, 100vw" className="object-cover" />
      </div>

      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }} aria-hidden="true">
        <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[#F5EE30]" />
        <span className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#F5EE30] text-black shadow-lg">
          <MoveHorizontal className="h-5 w-5" />
        </span>
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
        After
      </span>
      {sample ? (
        <SampleChip
          label={typeof sample === "string" ? sample : "Sample"}
          className="pointer-events-none absolute bottom-3 right-3"
        />
      ) : null}

      <input
        type="range"
        min="0"
        max="100"
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Compare the old and the new logo"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
      <figcaption className="sr-only">
        Before: {before.alt}. After: {after.alt}.
      </figcaption>
    </figure>
  );
}
