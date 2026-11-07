import Image from "next/image";

import { formatGroupedNumber } from "@/lib/marketing-portfolio-charts";

import RevealOnView from "../RevealOnView";
import LineChartSvg from "./LineChartSvg";
import ProofStage from "./ProofStage";

function Phone({ proof, size }) {
  const large = size === "large";

  return (
    <div
      className={`mx-auto w-full ${large ? "max-w-[19rem]" : "max-w-[12.5rem]"} rounded-[1.75rem] border border-white/15 bg-[#0d0d0c] p-1.5 shadow-[0_30px_70px_-40px_rgba(245,238,48,0.55)]`}
    >
      <div className="overflow-hidden rounded-[1.35rem] bg-[#faf8f4] text-[#1b1b18]">
        <div className={`flex items-center gap-2 ${large ? "px-4 pb-2 pt-4" : "px-2.5 pb-1.5 pt-2.5"}`}>
          <Image
            src={proof.avatar.src}
            alt=""
            width={proof.avatar.width}
            height={proof.avatar.height}
            sizes="2.5rem"
            className={`${large ? "h-9 w-9" : "h-6 w-6"} shrink-0 rounded-full object-cover`}
          />
          <span className={`truncate font-bold ${large ? "text-sm" : "text-[10px]"}`}>{proof.handle}</span>
        </div>
        <dl className={`grid text-center ${large ? "grid-cols-3 px-3 pb-3" : "grid-cols-2 px-2 pb-2"}`}>
          {proof.profileStats.slice(0, large ? 3 : 2).map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className={`${large ? "text-[11px]" : "text-[8px]"} text-black/55`}>{stat.label}</dt>
              <dd className={`${large ? "text-sm" : "text-[10px]"} font-bold tabular-nums`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid grid-cols-3 gap-px bg-black/10">
          {proof.posts.slice(0, 9).map((post) => (
            <div key={post.src} className="relative aspect-square">
              <Image src={post.src} alt={post.alt} fill sizes={large ? "6.5rem" : "4.5rem"} className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Social media: the feed itself in a phone frame, and follower growth.
export default function ProofSocial({ study, proof, size = "card", sample = false }) {
  const points = proof.growth.points;
  const first = points[0].value;
  const last = points[points.length - 1].value;

  if (size === "large") {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <ProofStage sample={sample} className="flex items-center justify-center">
          <div className="flex h-full items-center justify-center p-6 sm:p-10">
            <Phone proof={proof} size="large" />
          </div>
        </ProofStage>
        <ProofStage sample={sample}>
          <RevealOnView className="flex h-full flex-col p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
              {proof.platform} · {proof.growth.label}
            </p>
            <p className="mt-3 text-4xl font-bold tabular-nums sm:text-5xl">{formatGroupedNumber(last)}</p>
            <p className="mt-2 text-sm text-white/55">up from {formatGroupedNumber(first)}</p>
            <LineChartSvg
              id={`${study.slug}-growth`}
              points={points}
              width={640}
              height={330}
              padding={{ top: 36, right: 24, bottom: 44, left: 56 }}
              fontSize={15}
              xLabels="all"
              className="mt-auto block h-auto w-full pt-6"
            />
          </RevealOnView>
        </ProofStage>
      </div>
    );
  }

  return (
    <ProofStage sample={sample} className="sm:aspect-[16/10]">
      <RevealOnView className="grid h-full grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-4 p-4 pt-12 sm:gap-6 sm:p-6">
        <Phone proof={proof} size="card" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
            {proof.platform} · {proof.growth.label}
          </p>
          <p className="mt-3 text-3xl font-bold leading-none tabular-nums sm:text-4xl">{formatGroupedNumber(last)}</p>
          <p className="mt-2 text-xs text-white/55">up from {formatGroupedNumber(first)}</p>
          <LineChartSvg
            id={`${study.slug}-spark`}
            points={points}
            width={260}
            height={120}
            padding={{ top: 14, right: 12, bottom: 10, left: 6 }}
            fontSize={12}
            strokeWidth={3}
            showTicks={false}
            showEndLabel={false}
            xLabels="none"
            label={`${proof.growth.label} from ${formatGroupedNumber(first)} to ${formatGroupedNumber(last)}`}
            className="mt-4 block h-auto w-full"
          />
        </div>
      </RevealOnView>
    </ProofStage>
  );
}
