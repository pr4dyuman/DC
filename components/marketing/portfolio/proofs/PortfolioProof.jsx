import { getStudyMark } from "@/lib/marketing-portfolio";

import ProofAds from "./ProofAds";
import ProofBranding from "./ProofBranding";
import ProofInfluencer from "./ProofInfluencer";
import ProofSeo from "./ProofSeo";
import ProofSocial from "./ProofSocial";
import ProofVideo from "./ProofVideo";
import ProofWebsite from "./ProofWebsite";

// The visual evidence for a case study, chosen by its proof type.
// size: "card" for grids, "large" for the case study page.
// media: "poster" shows a still instead of a website's walkthrough video.
// details: false leaves out parts of the large proof (the SEO result card and
// keyword table, the ad card, the creator list) when the case study page shows
// fuller versions of them as insights.
// mark: the chip's text, to override the study's own ("Sample", "Draft").
export default function PortfolioProof({ study, size = "card", media = "video", priority = false, details = true, mark }) {
  const { proof } = study;
  const sample = mark ?? getStudyMark(study);

  switch (proof.type) {
    case "website":
      return <ProofWebsite study={study} proof={proof} size={size} media={media} priority={priority} />;
    case "seo":
      return <ProofSeo study={study} proof={proof} size={size} sample={sample} details={details} />;
    case "social":
      return <ProofSocial study={study} proof={proof} size={size} sample={sample} />;
    case "ads":
      return <ProofAds proof={proof} size={size} sample={sample} details={details} />;
    case "video":
      return <ProofVideo proof={proof} size={size} sample={sample} />;
    case "influencer":
      return <ProofInfluencer proof={proof} size={size} sample={sample} details={details} />;
    case "branding":
      return <ProofBranding proof={proof} size={size} sample={sample} />;
    default:
      return null;
  }
}
