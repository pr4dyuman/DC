import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Play,
  ShieldCheck,
} from "lucide-react";

import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Portfolio | Digital Corvids Work, Websites, SEO & Campaigns",
  description:
    "Explore the Digital Corvids portfolio format for websites, SEO, PPC, social media, video production, influencer campaigns, and AI product work.",
  path: "/portfolio",
  keywords: [
    "Digital Corvids portfolio",
    "digital marketing portfolio Jaipur",
    "website development portfolio",
    "SEO case studies",
    "PPC campaign portfolio",
    "social media marketing work",
  ],
});

const filters = [
  "All",
  "Websites",
  "SEO",
  "PPC",
  "Social Media",
  "Video",
  "AI Products",
];

const featuredProjectProof = [
  "Live website walkthrough",
  "Homepage and services journey",
  "Desktop motion preview",
  "Public URL available",
];

const portfolioFormats = [
  {
    id: "website-reels",
    code: "WEB",
    eyebrow: "Website Projects",
    title: "Website walkthrough reels",
    description:
      "Full-site builds shown as compact browser journeys across homepage, navigation, key pages, forms, and mobile states.",
    tags: ["Web Development", "UX", "Performance"],
    proof: ["Live website link", "Responsive views", "Launch checklist"],
    variant: "website",
  },
  {
    id: "seo-proof",
    code: "SEO",
    eyebrow: "SEO Work",
    title: "SEO proof dashboards",
    description:
      "SEO projects shown with audit findings, technical fixes, content work, indexing checks, and approved performance snapshots.",
    tags: ["SEO", "Technical Audit", "Content"],
    proof: ["Issue fixes", "GSC screenshots", "Keyword movement"],
    variant: "seo",
  },
  {
    id: "paid-media",
    code: "PPC",
    eyebrow: "PPC & Ads",
    title: "Campaign performance stories",
    description:
      "Paid media work shown through ad creative, funnel pages, campaign structure, reporting views, and approved result cards.",
    tags: ["PPC", "Ads", "Landing Pages"],
    proof: ["Creative set", "Campaign setup", "Lead tracking"],
    variant: "ads",
  },
  {
    id: "social-content",
    code: "SOC",
    eyebrow: "Social Media",
    title: "Content systems and calendars",
    description:
      "Social work shown as brand grids, calendar systems, creative batches, caption direction, and monthly report previews.",
    tags: ["Social Media", "Content", "Reporting"],
    proof: ["Post grid", "Calendar", "Report snapshot"],
    variant: "social",
  },
  {
    id: "video-production",
    code: "VID",
    eyebrow: "Video & Production",
    title: "Video campaign showcases",
    description:
      "Video production work shown with storyboards, production frames, final cuts, ad formats, and channel-ready exports.",
    tags: ["Video", "Ad Films", "Reels"],
    proof: ["Final cut", "Formats", "Distribution plan"],
    variant: "video",
  },
  {
    id: "product-labs",
    code: "AI",
    eyebrow: "AI Products",
    title: "Internal products and automation",
    description:
      "Digital Corvids product work shown through interface walkthroughs, workflow automation, dashboards, and client operations.",
    tags: ["AI Blogger", "Manage Company", "Automation"],
    proof: ["Product UI", "Workflow", "Operational value"],
    variant: "product",
  },
];

const caseStudySections = [
  {
    title: "Snapshot",
    description: "Client, category, timeline, services, team, and project role.",
  },
  {
    title: "Problem",
    description: "The business challenge, SEO issue, conversion gap, or content bottleneck.",
  },
  {
    title: "What We Built",
    description: "Website, campaign, content system, technical fixes, dashboards, or automation.",
  },
  {
    title: "Motion Preview",
    description: "Short walkthrough video, report reel, dashboard clip, or campaign creative sequence.",
  },
  {
    title: "Proof",
    description: "Approved metrics, screenshots, before-after notes, deliverables, and reporting assets.",
  },
];

const proofTypes = [
  {
    code: "01",
    title: "Live walkthrough",
    description: "Best for websites, landing pages, product dashboards, and client portals.",
  },
  {
    code: "02",
    title: "Result snapshot",
    description: "Best for SEO, PPC, reporting, traffic, leads, rankings, and content performance.",
  },
  {
    code: "03",
    title: "Process evidence",
    description: "Best for brand work, video, social calendars, audits, and strategy-heavy projects.",
  },
];

function BrowserChrome({ children, label }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-white/15 bg-[#070707]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F5EE30]" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="ml-2 min-w-0 flex-1 truncate rounded-sm border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function WebsitePreview() {
  return (
    <BrowserChrome label="project-site.com">
      <div className="portfolio-browser-window">
        <div className="portfolio-browser-track space-y-3 p-4">
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
            <div className="h-24 rounded-sm bg-[#F5EE30]" />
            <div className="space-y-2">
              <div className="h-3 w-4/5 rounded-full bg-white/80" />
              <div className="h-3 w-3/5 rounded-full bg-white/35" />
              <div className="h-8 w-28 rounded-full bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 rounded-sm border border-white/10 bg-white/[0.06]" />
            <div className="h-16 rounded-sm border border-white/10 bg-white/[0.06]" />
            <div className="h-16 rounded-sm border border-white/10 bg-white/[0.06]" />
          </div>
          <div className="h-28 rounded-sm border border-white/10 bg-white/[0.05]" />
          <div className="grid grid-cols-[0.7fr_1fr] gap-3">
            <div className="h-24 rounded-sm bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-white/65" />
              <div className="h-3 w-5/6 rounded-full bg-white/25" />
              <div className="h-3 w-2/3 rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function FeaturedWebsiteVideo() {
  return (
    <BrowserChrome label="digitalcorvids.com">
      <div className="relative overflow-hidden bg-black">
        <video
          className="aspect-[16/10] h-full w-full bg-black object-contain"
          src="/portfolio/digital-corvids-website.webm"
          poster="/portfolio/digital-corvids-website-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Digital Corvids website walkthrough video"
        >
          Digital Corvids website walkthrough.
        </video>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5EE30]">
                Featured Website
              </p>
              <p className="mt-1 text-lg font-bold uppercase leading-tight text-white">
                Digital Corvids
              </p>
            </div>
            <span className="rounded-full bg-[#F5EE30] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">
              Video Proof
            </span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function DashboardPreview({ variant }) {
  const isAds = variant === "ads";
  const isProduct = variant === "product";
  const isSeo = variant === "seo";

  return (
    <BrowserChrome label={isProduct ? "dc-product.app" : isAds ? "campaign-report" : "seo-report"}>
      <div className="portfolio-browser-window">
        <div className="portfolio-browser-track p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="h-3 w-28 rounded-full bg-white/75" />
              <div className="mt-2 h-2 w-20 rounded-full bg-white/25" />
            </div>
            <div className="rounded-full bg-[#F5EE30] px-3 py-1 text-[10px] font-bold uppercase text-black">
              {isSeo ? "Audit" : isAds ? "Live" : "AI"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-sm border border-white/10 p-2">
              <div className="h-2 w-10 rounded-full bg-white/30" />
              <div className="mt-3 h-6 w-12 rounded-sm bg-[#F5EE30]" />
            </div>
            <div className="rounded-sm border border-white/10 p-2">
              <div className="h-2 w-12 rounded-full bg-white/30" />
              <div className="mt-3 h-6 w-10 rounded-sm bg-white/70" />
            </div>
            <div className="rounded-sm border border-white/10 p-2">
              <div className="h-2 w-14 rounded-full bg-white/30" />
              <div className="mt-3 h-6 w-14 rounded-sm bg-white/20" />
            </div>
          </div>
          <div className="mt-3 rounded-sm border border-white/10 p-3">
            <div className="mb-3 flex items-end gap-1">
              {[38, 54, 42, 68, 58, 74, 86].map((height) => (
                <span
                  key={height}
                  className="w-full rounded-t-sm bg-[#F5EE30]"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-3 rounded-full bg-white/55" />
              <div className="h-3 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-sm border border-white/10 px-2 py-2">
                <span className="h-2 w-2 rounded-full bg-[#F5EE30]" />
                <span className="h-2 flex-1 rounded-full bg-white/45" />
                <span className="h-2 w-10 rounded-full bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function SocialPreview() {
  return (
    <BrowserChrome label="content-calendar">
      <div className="portfolio-browser-window">
        <div className="portfolio-browser-track grid grid-cols-3 gap-2 p-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
            <div
              key={item}
              className={`aspect-square rounded-sm border border-white/10 ${
                item % 3 === 0 ? "bg-[#F5EE30]" : item % 2 === 0 ? "bg-white/20" : "bg-white/[0.07]"
              }`}
            >
              <div className="mt-auto h-full p-2">
                <div className="mt-10 h-2 rounded-full bg-black/40" />
                <div className="mt-1 h-2 w-2/3 rounded-full bg-black/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

function VideoPreview() {
  return (
    <BrowserChrome label="video-campaign">
      <div className="portfolio-browser-window">
        <div className="portfolio-browser-track p-4">
          <div className="relative flex h-36 items-center justify-center rounded-sm bg-[#F5EE30] text-black">
            <Play className="h-10 w-10 fill-black" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded-full bg-white/20" />
            <div className="h-3 w-3/4 rounded-full bg-white/20" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 rounded-sm border border-white/10 bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function PortfolioPreview({ variant }) {
  if (variant === "website") return <WebsitePreview />;
  if (variant === "social") return <SocialPreview />;
  if (variant === "video") return <VideoPreview />;
  return <DashboardPreview variant={variant} />;
}

function FormatCard({ format }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[#F5EE30]/70">
      <div className="relative p-3">
        <PortfolioPreview variant={format.variant} />
        <div className="portfolio-scanline" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col border-t border-white/10 p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#F5EE30]">
              {format.eyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-white">
              {format.title}
            </h3>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black text-[#F5EE30]">
            <span className="text-xs font-bold uppercase tracking-[0.12em]">{format.code}</span>
          </span>
        </div>
        <p className="text-sm leading-6 text-gray-300">{format.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {format.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {format.proof.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-[#F5EE30]" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <Link
          href="#case-study-format"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#F5EE30] transition-colors group-hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
        >
          Case study format
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function PortfolioPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.76fr_1.24fr] lg:items-center">
          <div className="min-w-0">
            <p className="font-glacial-bold text-sm uppercase tracking-[0.35em] text-[#F5EE30]">
              Portfolio System
            </p>
            <h1 className="mt-5 max-w-4xl font-suifak text-[clamp(3rem,9vw,7.4rem)] uppercase leading-[0.85] tracking-tight">
              Work That Moves
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg">
              Digital Corvids portfolio should feel like proof in motion: live website walkthroughs,
              SEO reports, campaign snapshots, social content systems, video work, and AI product
              interfaces organized in one sharp gallery.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#work-gallery"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
              >
                View Gallery Style
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                prefetch={false}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
              >
                Start A Project
              </Link>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="grid min-w-0 gap-3">
              <div className="min-w-0 rounded-md border border-white/10 bg-[#050505] p-3">
                <FeaturedWebsiteVideo />
              </div>
              <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_0.78fr]">
                <div className="min-w-0 rounded-md border border-white/10 bg-[#050505] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5EE30]">
                    Proof Card
                  </p>
                  <h2 className="mt-3 text-2xl font-bold uppercase leading-none text-white">
                    Digital Corvids Website
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-300">
                    First portfolio reel showing how a website project can open, move, and prove
                    the work before a visitor reads the full case study.
                  </p>
                  <div className="mt-4 space-y-3">
                    {featuredProjectProof.map((item) => (
                      <div key={item} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                        <span className="text-sm text-gray-300">{item}</span>
                        <span className="h-2 w-12 rounded-full bg-[#F5EE30]" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-[#F5EE30] p-4 text-black">
                  <p className="text-xs font-bold uppercase tracking-[0.24em]">Best Format</p>
                  <p className="mt-3 text-3xl font-bold uppercase leading-none">Video first, proof second.</p>
                  <a
                    href="https://digitalcorvids.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] underline decoration-black/30 underline-offset-4"
                  >
                    Visit live site
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="work-gallery" className="px-6 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-glacial-bold text-sm uppercase tracking-[0.35em] text-[#F5EE30]">
                Gallery Direction
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
                Not only websites. Full proof of digital work.
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-7 text-gray-300">
              The portfolio should let visitors filter by service, watch quick project reels, then open
              deeper case studies with context, deliverables, approved proof, and links where public access
              is allowed.
            </p>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <span
                key={filter}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                  filter === "All"
                    ? "border-[#F5EE30] bg-[#F5EE30] text-black"
                    : "border-white/15 text-white/80"
                }`}
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioFormats.map((format) => (
              <FormatCard key={format.id} format={format} />
            ))}
          </div>
        </div>
      </section>

      <section id="case-study-format" className="border-y border-white/10 bg-white text-black px-6 py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-glacial-bold text-sm uppercase tracking-[0.35em] text-black/50">
              Case Study Template
            </p>
            <h2 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
              Every project needs a clean story.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
              Website visitors should understand what Digital Corvids did, why it mattered, and what
              proof is approved to show. This structure works for websites, SEO, ads, social, video, and
              AI product work.
            </p>
          </div>
          <div className="grid gap-3">
            {caseStudySections.map((section, index) => (
              <div
                key={section.title}
                className="grid gap-4 rounded-lg border border-black/10 bg-neutral-50 p-4 sm:grid-cols-[4rem_1fr]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-black text-sm font-bold text-[#F5EE30]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase">{section.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-glacial-bold text-sm uppercase tracking-[0.35em] text-[#F5EE30]">
                Proof Styles
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
                Three ways to show work without forcing everything into one grid.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {proofTypes.map((proof) => {
                return (
                  <article key={proof.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#F5EE30] text-black">
                      <span className="text-sm font-bold">{proof.code}</span>
                    </span>
                    <h3 className="mt-5 text-xl font-bold uppercase">{proof.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{proof.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl rounded-lg border border-[#F5EE30]/40 bg-[#F5EE30] p-6 text-black sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-center">
            <div>
              <p className="font-glacial-bold text-sm uppercase tracking-[0.35em] text-black/60">
                Next Step
              </p>
              <h2 className="mt-3 text-4xl font-bold uppercase leading-tight sm:text-5xl">
                Send project names, links, and approved proof.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-black/75">
                Once the real projects are shared, each card can receive a video source, poster image,
                live website link, services delivered, project summary, and approved metrics. Private
                projects can be anonymized without weakening the portfolio.
              </p>
            </div>
            <div className="rounded-lg border border-black/15 bg-black p-5 text-white">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-[#F5EE30]" aria-hidden="true" />
                <p className="font-bold uppercase tracking-[0.18em]">Needed Per Project</p>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-gray-300">
                {["Project name", "Category", "Live URL or screenshots", "Services delivered", "Allowed proof", "Privacy notes"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F5EE30]" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
