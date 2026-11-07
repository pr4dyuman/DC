import { Search } from "lucide-react";

import RevealOnView from "../RevealOnView";
import LineChartSvg from "./LineChartSvg";
import ProofStage from "./ProofStage";

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

// SEO: monthly organic clicks with the start of the work marked, the client's
// result on the search page, and keyword positions before and after.
export default function ProofSeo({ study, proof, size = "card", sample = false }) {
  const marker = Number.isInteger(proof.startIndex) ? { index: proof.startIndex, label: proof.startLabel } : null;
  const top = bestKeyword(proof.keywords);

  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-5">
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
        {proof.serp || proof.keywords?.length ? (
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
