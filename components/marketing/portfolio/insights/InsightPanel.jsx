import ProofStage from "../proofs/ProofStage";

// The frame for one extra visual on a case study page: a title, the visual,
// and a short note on what it shows. Sample case studies get the Sample chip.
export default function InsightPanel({ title, note, sample = false, light = false, className = "", children }) {
  return (
    <figure className={`flex h-full flex-col ${className}`}>
      <ProofStage sample={sample} className={`flex-1 ${light ? "bg-[#0b0b0a]" : ""}`}>
        <div className="flex h-full flex-col p-4 sm:p-6">
          <figcaption className="pr-20 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{title}</figcaption>
          <div className="mt-5 flex min-h-0 flex-1 flex-col">{children}</div>
          {note ? <p className="mt-5 text-xs leading-5 text-white/45">{note}</p> : null}
        </div>
      </ProofStage>
    </figure>
  );
}
