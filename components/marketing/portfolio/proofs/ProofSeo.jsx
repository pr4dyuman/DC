import { Search } from "lucide-react";

import RevealOnView from "../RevealOnView";
import DualLineChartSvg from "./DualLineChartSvg";
import LineChartSvg from "./LineChartSvg";
import ProofStage from "./ProofStage";

// Colours for the report's four figures, in order: clicks, impressions,
// click-through rate and average position.
const REPORT_COLORS = ["#F5EE30", "#9AA9FF", "#5FD3A8", "#FFB15C"];

function bestKeyword(keywords = []) {
  return [...keywords].sort((a, b) => a.after - b.after)[0];
}

function SerpMock({ serp }) {
  return (
    <figure className="rounded-lg bg-[#f7f7f2] p-5 text-[#1c1c18] sm:p-6">
      <figcaption className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
        Search result · Position {serp.position}
      </figcaption>
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 shrink-0 rounded-full bg-[#3b2a1e]" aria-hidden="true" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold">{serp.siteName}</p>
          <p className="truncate text-xs text-black/55">{serp.url}</p>
        </div>
      </div>
      <p className="mt-3 text-lg leading-snug text-[#2b44c9]">{serp.title}</p>
      <p className="mt-1 text-sm leading-6 text-black/65">{serp.description}</p>
    </figure>
  );
}

function KeywordTable({ keywords }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Keyword positions on Google</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-white/45">
              <th scope="col" className="pb-3 pr-4 font-bold">Search term</th>
              <th scope="col" className="pb-3 pr-4 text-right font-bold">Before</th>
              <th scope="col" className="pb-3 text-right font-bold">After</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((keyword) => (
              <tr key={keyword.term} className="border-t border-white/10">
                <td className="py-3 pr-4 text-white/85">{keyword.term}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-white/50">
                  {keyword.before === null ? (
                    <>
                      100+<span className="sr-only"> (not ranking)</span>
                    </>
                  ) : (
                    keyword.before
                  )}
                </td>
                <td className="py-3 text-right font-bold tabular-nums text-[#F5EE30]">{keyword.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// A Search Console style report: first and latest month for each figure, then
// clicks and impressions on one chart, with markers for each step of the work.
function SearchPerformance({ study, proof, sample }) {
  const { report } = proof;
  const primary = { label: "Clicks", points: proof.points, color: REPORT_COLORS[0] };
  const secondary = { label: "Impressions", points: report.impressions, color: REPORT_COLORS[1] };
  const firstLabel = proof.points[0].label;
  const lastLabel = proof.points[proof.points.length - 1].label;

  return (
    <ProofStage sample={sample}>
      <RevealOnView className="p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pr-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{report.title}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
            {[primary, secondary].map((series) => (
              <li key={series.label} className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" />
                {series.label}
              </li>
            ))}
          </ul>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 lg:grid-cols-4">
          {report.metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="bg-[#0a0a0a] p-4 sm:p-5"
              style={{ boxShadow: `inset 0 3px 0 ${REPORT_COLORS[index % REPORT_COLORS.length]}` }}
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{metric.label}</dt>
              <dd className="mt-2 text-2xl font-bold tabular-nums text-white sm:text-3xl">{metric.after}</dd>
              <dd className="mt-1 text-xs text-white/50">
                {lastLabel}, from {metric.before} in {firstLabel}
              </dd>
            </div>
          ))}
        </dl>

        <DualLineChartSvg
          id={`${study.slug}-report-lg`}
          primary={primary}
          secondary={secondary}
          markers={report.markers}
          width={960}
          height={420}
          padding={{ top: 64, right: 64, bottom: 44, left: 60 }}
          fontSize={14}
          className="mt-6 hidden h-auto w-full sm:block"
        />
        <DualLineChartSvg
          id={`${study.slug}-report-sm`}
          primary={primary}
          secondary={secondary}
          markers={report.markers}
          width={420}
          height={340}
          padding={{ top: 60, right: 50, bottom: 44, left: 48 }}
          fontSize={14}
          xLabels="key"
          className="mt-6 block h-auto w-full sm:hidden"
        />
        {report.markers?.length ? (
          <p className="mt-3 text-xs leading-5 text-white/45">Numbered markers show when each step below began.</p>
        ) : null}
      </RevealOnView>
    </ProofStage>
  );
}

// The original single-series chart, for SEO case studies without a report.
function ClicksChart({ study, proof, sample, marker }) {
  return (
    <ProofStage sample={sample}>
      <RevealOnView className="p-4 sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">{proof.metric}</p>
        <LineChartSvg
          id={`${study.slug}-lg`}
          points={proof.points}
          width={960}
          height={420}
          padding={{ top: 48, right: 28, bottom: 44, left: 60 }}
          fontSize={14}
          marker={marker}
          xLabels="all"
          className="mt-4 hidden h-auto w-full sm:block"
        />
        <LineChartSvg
          id={`${study.slug}-sm`}
          points={proof.points}
          width={420}
          height={320}
          padding={{ top: 44, right: 16, bottom: 44, left: 48 }}
          fontSize={15}
          marker={marker}
          className="mt-4 block h-auto w-full sm:hidden"
        />
      </RevealOnView>
    </ProofStage>
  );
}

// SEO: monthly organic clicks with the start of the work marked, the client's
// result on the search page, and keyword positions before and after.
// `details: false` leaves out the result card and keyword table when the case
// study page shows fuller versions of them as insights.
export default function ProofSeo({ study, proof, size = "card", sample = false, details = true }) {
  const marker = Number.isInteger(proof.startIndex) ? { index: proof.startIndex, label: proof.startLabel } : null;
  const top = bestKeyword(proof.keywords);

  if (size === "large") {
    const showDetails = details && (proof.serp || proof.keywords?.length);

    return (
      <div className="grid grid-cols-1 gap-5">
        {proof.report ? (
          <SearchPerformance study={study} proof={proof} sample={sample} />
        ) : (
          <ClicksChart study={study} proof={proof} sample={sample} marker={marker} />
        )}
        {showDetails ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {proof.serp ? <SerpMock serp={proof.serp} /> : null}
            {proof.keywords?.length ? <KeywordTable keywords={proof.keywords} /> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="sm:aspect-[16/10]">
      <RevealOnView className="flex h-full flex-col">
        <p className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55 sm:px-5 sm:pt-5">
          {proof.metric}
        </p>
        <div className="min-h-0 flex-1 px-2 pb-12 sm:pb-11">
          <LineChartSvg
            id={`${study.slug}-card`}
            points={proof.points}
            width={640}
            height={330}
            padding={{ top: 40, right: 34, bottom: 40, left: 60 }}
            fontSize={17}
            strokeWidth={4}
            marker={marker}
            className="block h-full w-full"
          />
        </div>
        {top ? (
          <p className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-[11px] font-bold text-white">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#F5EE30]" aria-hidden="true" />
            <span className="text-[#F5EE30]">#{top.after}</span>
            <span className="truncate font-normal text-white/75">{top.term}</span>
          </p>
        ) : null}
      </RevealOnView>
    </ProofStage>
  );
}
