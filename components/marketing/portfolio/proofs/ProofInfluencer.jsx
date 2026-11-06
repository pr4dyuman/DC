import Image from "next/image";

import ProofStage from "./ProofStage";

const AVATAR_TONES = ["bg-[#e8c9a6]", "bg-[#b9cbb0]", "bg-[#c9c3e6]", "bg-[#f0d97b]", "bg-[#a9c7d8]"];

function Avatar({ creator, index, size = "sm" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-[#050505] font-bold text-black ${AVATAR_TONES[index % AVATAR_TONES.length]} ${size === "lg" ? "h-12 w-12 text-sm" : "h-8 w-8 text-[10px]"}`}
      aria-hidden="true"
    >
      {creator.initials}
    </span>
  );
}

function ContentTile({ item, className = "", sizes }) {
  return (
    <div className={`relative overflow-hidden rounded-md border border-white/10 bg-black ${className}`}>
      <Image src={item.src} alt={item.alt} fill sizes={sizes} className="object-cover" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-[10px] font-bold text-white">
        {item.handle}
      </span>
    </div>
  );
}

// Influencer: who posted, and what they made.
export default function ProofInfluencer({ proof, size = "card", sample = false }) {
  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ProofStage sample={sample}>
          <div className="p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Creators in the campaign</p>
            <ul className="mt-5 divide-y divide-white/10">
              {proof.creators.map((creator, index) => (
                <li key={creator.handle} className="flex items-center gap-4 py-3">
                  <Avatar creator={creator} index={index} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{creator.name}</p>
                    <p className="truncate text-sm text-white/55">{creator.handle}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-[#F5EE30]">
                    {creator.followers}
                    <span className="ml-1 font-normal text-white/50">followers</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </ProofStage>
        <ul className="grid grid-cols-3 gap-3">
          {proof.content.map((item) => (
            <li key={item.src}>
              <ContentTile item={item} className="aspect-[9/16]" sizes="(min-width: 1024px) 14rem, 33vw" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="sm:aspect-[16/10]">
      <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-3 pr-20">
          <div className="flex -space-x-2">
            {proof.creators.slice(0, 5).map((creator, index) => (
              <Avatar key={creator.handle} creator={creator} index={index} />
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Creators</p>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5">
          {proof.content.slice(0, 3).map((item) => (
            <ContentTile key={item.src} item={item} className="aspect-[9/14] sm:aspect-auto" sizes="(min-width: 1024px) 11rem, 30vw" />
          ))}
        </div>
      </div>
    </ProofStage>
  );
}
