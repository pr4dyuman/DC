import InsightPanel from "./InsightPanel";

function Monogram({ letters, color, size = "h-16 w-16 text-2xl" }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full border-2 font-suifak leading-none ${size}`}
      style={{ borderColor: color, color }}
      aria-hidden="true"
    >
      <span className="absolute inset-1 rounded-full border" style={{ borderColor: color, opacity: 0.6 }} />
      {letters}
    </span>
  );
}

// A brand's logo versions, drawn in the brand's own colours and type.
export default function InsightLogoVersions({ insight, sample }) {
  const { name, monogram, tagline, colors } = insight;
  const words = name.split(" ");

  const versions = [
    {
      label: "Full logo",
      use: "Signs and the website",
      background: colors.dark,
      content: (
        <div className="flex items-center gap-4">
          <Monogram letters={monogram} color={colors.accent} />
          <div className="min-w-0">
            <p className="font-suifak text-2xl uppercase leading-none sm:text-[1.7rem]" style={{ color: colors.light }}>
              {name}
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: colors.accent }}>
              {tagline}
            </p>
          </div>
        </div>
      ),
    },
    {
      label: "Stacked",
      use: "Packaging and social posts",
      background: colors.light,
      content: (
        <div className="flex flex-col items-center text-center">
          <Monogram letters={monogram} color={colors.dark} size="h-14 w-14 text-xl" />
          <p className="mt-3 font-suifak text-2xl uppercase leading-[0.95]" style={{ color: colors.dark }}>
            {words.map((word) => (
              <span key={word} className="block">
                {word}
              </span>
            ))}
          </p>
        </div>
      ),
    },
    {
      label: "Monogram",
      use: "Stamps, labels and small spaces",
      background: colors.accent,
      content: <Monogram letters={monogram} color={colors.dark} size="h-24 w-24 text-4xl" />,
    },
  ];

  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {versions.map((version) => (
          <li key={version.label}>
            <div
              className="flex aspect-[4/3] items-center justify-center rounded-md border border-white/10 p-5"
              style={{ backgroundColor: version.background }}
              role="img"
              aria-label={`${version.label} version of the ${name} logo`}
            >
              {version.content}
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white">{version.label}</p>
            <p className="mt-1 text-xs text-white/50">{version.use}</p>
          </li>
        ))}
      </ul>
    </InsightPanel>
  );
}
