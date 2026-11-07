import { notFound } from "next/navigation";

import CaseStudyPageContent from "@/components/marketing/portfolio/CaseStudyPageContent";
import { getPortfolioCaseStudies, getPortfolioCaseStudy, hasCaseStudyPage } from "@/lib/marketing-portfolio";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const dynamicParams = false;

// Every case study page, samples included, for the noindex preview.
export function generateStaticParams() {
  return getPortfolioCaseStudies({ includeSamples: true })
    .filter(hasCaseStudyPage)
    .map((study) => ({ slug: study.slug }));
}

function getPreviewStudy(slug) {
  const study = getPortfolioCaseStudy(slug, { includeSamples: true });
  return study && hasCaseStudyPage(study) ? study : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const study = getPreviewStudy(slug);
  if (!study) {
    return {};
  }

  return buildMarketingMetadata({
    title: `Preview: ${study.client} | Digital Corvids`,
    description: study.summary,
    path: `/portfolio/preview/${study.slug}`,
    noIndex: true,
  });
}

export default async function CaseStudyPreviewPage({ params }) {
  const { slug } = await params;
  const study = getPreviewStudy(slug);
  if (!study) {
    notFound();
  }

  return <CaseStudyPageContent study={study} preview />;
}
