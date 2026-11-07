import { notFound } from "next/navigation";

import TemplateDemoViewer from "@/components/marketing/templates/TemplateDemoViewer";
import { getMarketingTemplate, getMarketingTemplates } from "@/lib/marketing-templates";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMarketingTemplates()
    .filter((template) => template.demoUrl)
    .map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getMarketingTemplate(slug);
  if (!template?.demoUrl) {
    return {};
  }

  // The page only frames the demo, so it stays out of search results; the
  // template page is the one to rank.
  return buildMarketingMetadata({
    title: `${template.name} Live Demo | Digital Corvids`,
    description: `Try the live demo of ${template.name}, a ${template.niche.toLowerCase()} website template, on desktop, tablet and phone sizes.`,
    path: `${template.path}/demo`,
    image: template.ogImage,
    noIndex: true,
  });
}

export default async function TemplateDemoPage({ params }) {
  const { slug } = await params;
  const template = getMarketingTemplate(slug);
  if (!template?.demoUrl) {
    notFound();
  }

  return (
    <TemplateDemoViewer
      name={template.name}
      niche={template.niche}
      slug={template.slug}
      path={template.path}
      demoUrl={template.demoUrl}
      purchase={template.purchase}
    />
  );
}
