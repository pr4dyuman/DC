import InsightBars from "./InsightBars";
import InsightCreatorLeaderboard from "./InsightCreatorLeaderboard";
import InsightCuts from "./InsightCuts";
import InsightFunnel from "./InsightFunnel";
import InsightLandingPage from "./InsightLandingPage";
import InsightLogoVersions from "./InsightLogoVersions";
import InsightMessageInbox from "./InsightMessageInbox";
import InsightPostStats from "./InsightPostStats";
import InsightRankMovement from "./InsightRankMovement";
import InsightRetention from "./InsightRetention";
import InsightScoreRings from "./InsightScoreRings";
import InsightSearchResults from "./InsightSearchResults";
import InsightSplit from "./InsightSplit";
import InsightTypeSpecimen from "./InsightTypeSpecimen";
import InsightWeeklyCombo from "./InsightWeeklyCombo";

const COMPONENTS = {
  "search-results": InsightSearchResults,
  "rank-movement": InsightRankMovement,
  "score-rings": InsightScoreRings,
  "message-inbox": InsightMessageInbox,
  "post-stats": InsightPostStats,
  bars: InsightBars,
  "weekly-combo": InsightWeeklyCombo,
  funnel: InsightFunnel,
  "landing-page": InsightLandingPage,
  retention: InsightRetention,
  cuts: InsightCuts,
  split: InsightSplit,
  "creator-leaderboard": InsightCreatorLeaderboard,
  "logo-versions": InsightLogoVersions,
  "type-specimen": InsightTypeSpecimen,
};

// Wide insights take a full row. Between them, an odd run of half-width
// insights gives its last one the full row, so the grid never leaves a gap.
function getFullWidth(insights) {
  const full = insights.map((insight) => Boolean(insight.wide));
  let run = [];
  const closeRun = () => {
    if (run.length % 2 === 1) full[run[run.length - 1]] = true;
    run = [];
  };
  insights.forEach((insight, index) => {
    if (insight.wide) closeRun();
    else run.push(index);
  });
  closeRun();
  return full;
}

// The extra visuals under a case study's main proof.
export default function PortfolioInsights({ insights = [], slug, sample = false }) {
  const known = insights.filter((insight) => COMPONENTS[insight.type]);
  if (!known.length) return null;
  const full = getFullWidth(known);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {known.map((insight, index) => {
        const Component = COMPONENTS[insight.type];
        return (
          <div key={`${insight.type}-${index}`} className={`min-w-0 ${full[index] ? "lg:col-span-2" : ""}`}>
            <Component insight={insight} id={`${slug}-${index}`} sample={sample} wide={full[index]} />
          </div>
        );
      })}
    </div>
  );
}
