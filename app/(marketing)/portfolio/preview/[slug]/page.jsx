import { notFound } from "next/navigation";

import CaseStudyPageContent from "@/components/marketing/portfolio/CaseStudyPageContent";
import { hasCaseStudyPage } from "@/lib/marketing-portfolio";
import { loadCaseStudies, loadCaseStudy } from "@/lib/marketing-portfolio-store";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

// Every case study page, samples and drafts included, for the noindex preview.
// Case studies added in Super Admin after a deploy render on first visit.
export async function generateStaticParams() {
  return (await loadCaseStudies({ includeSamples: true }))
    .filter(hasCaseStudyPage)
    .map((study) => ({ slug: study.slug }));
}

async function getPreviewStudy(slug) {
  const study = await loadCaseStudy(slug, { includeSamples: true });
  return study && hasCaseStudyPage(study) ? study : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const study = await getPreviewStudy(slug);
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
  const study = await getPreviewStudy(slug);
  if (!study) {
    notFound();
  }

  return <CaseStudyPageContent study={study} preview />;
}
