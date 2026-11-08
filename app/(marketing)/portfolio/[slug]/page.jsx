import { notFound } from "next/navigation";

import CaseStudyPageContent from "@/components/marketing/portfolio/CaseStudyPageContent";
import { hasCaseStudyPage } from "@/lib/marketing-portfolio";
import { loadCaseStudies, loadCaseStudy } from "@/lib/marketing-portfolio-store";
import {
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

// Published case studies with a story. Samples and drafts have no page here:
// they live only under /portfolio/preview. Case studies published after a
// deploy render on first visit.
export async function generateStaticParams() {
  return (await loadCaseStudies())
    .filter(hasCaseStudyPage)
    .map((study) => ({ slug: study.slug }));
}

async function getPublishedStudy(slug) {
  const study = await loadCaseStudy(slug);
  return study && hasCaseStudyPage(study) ? study : null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const study = await getPublishedStudy(slug);
  if (!study) {
    return {};
  }

  const headline = study.headline ? `${study.headline.value} ${study.headline.label.toLowerCase()}` : study.industry;
  return buildMarketingMetadata({
    title: `${study.client}: ${headline} | Digital Corvids`,
    description: study.summary,
    path: `/portfolio/${study.slug}`,
  });
}

export default async function CaseStudyPage({ params }) {
  const { slug } = await params;
  const study = await getPublishedStudy(slug);
  if (!study) {
    notFound();
  }

  const structuredData = getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Portfolio", path: "/portfolio" },
    { name: study.client, path: `/portfolio/${study.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <CaseStudyPageContent study={study} />
    </>
  );
}
