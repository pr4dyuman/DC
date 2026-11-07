import InsightPanel from "./InsightPanel";

const FAMILY_CLASS = { display: "font-suifak", text: "font-glacial" };

// The brand's typefaces, each with what it is used for and a sample.
export default function InsightTypeSpecimen({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {insight.faces.map((face) => (
          <li key={face.name} className="flex flex-col rounded-md border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5EE30]">{face.name}</p>
              <p className="text-right text-xs text-white/50">{face.role}</p>
            </div>
            <p
              className={`mt-6 ${FAMILY_CLASS[face.family]} ${
                face.family === "display" ? "text-5xl uppercase leading-[0.95] sm:text-6xl" : "text-lg leading-8 text-white/85"
              }`}
            >
              {face.sample}
            </p>
            <p className={`mt-auto pt-6 ${FAMILY_CLASS[face.family]} text-2xl tracking-wide text-white/45`} aria-hidden="true">
              Aa Bb Cc 123
            </p>
          </li>
        ))}
      </ul>
    </InsightPanel>
  );
}
