import Image from "../PortfolioImage";

import BrandingCompare from "./BrandingCompare";
import ProofStage from "./ProofStage";

function Palette({ palette, size = "sm" }) {
  if (size === "lg") {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {palette.map((color) => (
          <li key={color.hex} className="overflow-hidden rounded-md border border-white/10">
            <span className="block h-20" style={{ backgroundColor: color.hex }} aria-hidden="true" />
            <span className="block bg-black px-3 py-2">
              <span className="block text-sm font-bold uppercase tracking-[0.08em] text-white">{color.name}</span>
              <span className="block text-xs tabular-nums text-white/55">{color.hex}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex gap-1.5" aria-label="Brand colours">
      {palette.map((color) => (
        <li
          key={color.hex}
          title={color.name}
          className="h-5 w-5 rounded-full border border-white/40"
          style={{ backgroundColor: color.hex }}
        >
          <span className="sr-only">{color.name}</span>
        </li>
      ))}
    </ul>
  );
}

// Branding: the new identity, the old one for comparison, the palette and the
// brand in use.
export default function ProofBranding({ proof, size = "card", sample = false }) {
  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-5">
        {proof.before ? (
          <BrandingCompare before={proof.before} after={proof.after} sample={sample} />
        ) : (
          <ProofStage sample={sample} className="aspect-[16/10]">
            <Image src={proof.after.src} alt={proof.after.alt} fill sizes="(min-width: 1280px) 76rem, 100vw" className="object-cover" />
          </ProofStage>
        )}
        <Palette palette={proof.palette} size="lg" />
        {proof.applications.length ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {proof.applications.map((item) => (
              <li key={item.src} className="relative aspect-[4/3] overflow-hidden rounded-md border border-white/10">
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 1024px) 24rem, 100vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="aspect-[16/10]">
      <Image
        src={proof.after.src}
        alt={proof.after.alt}
        fill
        sizes="(min-width: 1024px) 40rem, 100vw"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
      <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
        After
      </span>
      {proof.before ? (
        <figure className="absolute left-3 top-3 w-[28%] max-w-[12rem] overflow-hidden rounded-md border border-white/30 bg-white shadow-xl sm:w-[30%]">
          <div className="relative aspect-[16/10]">
            <Image src={proof.before.src} alt={proof.before.alt} fill sizes="13rem" className="object-cover" />
          </div>
          <figcaption className="absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
            Before
          </figcaption>
        </figure>
      ) : null}
      <div className="absolute bottom-3 right-3">
        <Palette palette={proof.palette} />
      </div>
    </ProofStage>
  );
}
