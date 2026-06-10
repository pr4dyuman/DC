"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const filters = ["All", "Web Apps", "Websites"];

const projects = [
  {
    id: "ezyprep",
    category: "Web Apps",
    index: "01",
    eyebrow: "AI Production SaaS",
    title: "EzyPrep",
    description:
      "A production planning workspace for script breakdowns, scheduling, reports, shot lists, call sheets, and film-prep handoffs.",
    scope: ["SaaS Product", "AI Workflow", "Script Editor", "Production Planning"],
    href: "https://ezyprep.onrender.com/",
    action: "Visit Live App",
    external: true,
    featured: true,
    video: "/portfolio/ezyprep-demo-script.webm?v=20260610-demo-tabs",
    poster: "/portfolio/ezyprep-demo-script-poster.jpg?v=20260610-demo-tabs",
  },
  {
    id: "drifting-wood",
    category: "Websites",
    index: "02",
    eyebrow: "Furniture E-commerce",
    title: "Drifting Wood",
    description:
      "An online furniture storefront designed around visual discovery, clear collections, detailed product pages, and direct purchase journeys.",
    scope: ["E-commerce", "Web Design", "Development", "Product Catalogue"],
    href: "https://driftingwood.in/",
    action: "Visit Live Website",
    external: true,
    video: "/portfolio/drifting-wood-website.webm?v=20260610-shop-collection",
    poster: "/portfolio/drifting-wood-website-poster.jpg?v=20260610-shop-collection",
  },
  {
    id: "design-dwellers",
    category: "Websites",
    index: "03",
    eyebrow: "Interior Design Website",
    title: "Design Dwellers Studio",
    description:
      "A live preview for an interior design studio website with portfolio storytelling, service detail, consultation paths, and polished project browsing.",
    scope: ["Interior Design", "Web Design", "Development", "Live Preview"],
    href: "https://design-dwellers.vercel.app/",
    action: "Visit Live Preview",
    external: true,
    video: "/portfolio/design-dwellers-website.webm?v=20260610-preview",
    poster: "/portfolio/design-dwellers-website-poster.jpg?v=20260610-preview",
  },
];

function ProjectAction({ project, className = "" }) {
  const content = (
    <>
      {project.action}
      {project.external ? (
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      )}
    </>
  );

  const sharedClassName = `inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] ${className}`;

  if (project.external) {
    return (
      <a
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={project.href} prefetch={false} className={sharedClassName}>
      {content}
    </Link>
  );
}

function ScopeList({ scope }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Project scope">
      {scope.map((item) => (
        <li
          key={item}
          className="text-xs font-bold uppercase tracking-[0.14em] text-white/55"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function PortfolioVideo({ src, poster, label, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncPlayback = () => {
      const rect = video.getBoundingClientRect();
      const isNearViewport = rect.bottom > -120 && rect.top < window.innerHeight + 120;

      if (isNearViewport && document.visibilityState === "visible") {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(syncPlayback, {
      rootMargin: "120px 0px",
      threshold: 0.05,
    });

    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={`aspect-[16/10] w-full bg-black object-contain ${className}`}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={label}
    >
      {label}
    </video>
  );
}

function FeaturedProject({ project }) {
  return (
    <article className="grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] lg:grid-cols-[1.45fr_0.55fr]">
      <div className="min-w-0 border-b border-white/10 bg-[#050505] p-2 sm:p-3 lg:border-b-0 lg:border-r">
        <PortfolioVideo
          src={project.video}
          poster={project.poster}
          label={`${project.title} product walkthrough`}
          className="rounded-md"
        />
      </div>

      <div className="flex min-w-0 flex-col p-5 sm:p-7 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#F5EE30]">
            {project.eyebrow}
          </p>
          <span className="text-sm font-bold tracking-[0.24em] text-white/35">
            {project.index}
          </span>
        </div>
        <h3 className="mt-4 font-suifak text-4xl uppercase leading-none sm:text-5xl lg:text-[3.4rem]">
          {project.title}
        </h3>
        <p className="mt-6 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">
          {project.description}
        </p>
        <div className="mt-6 border-t border-white/10 pt-5">
          <ScopeList scope={project.scope} />
        </div>
        <ProjectAction project={project} className="mt-auto pt-8" />
      </div>
    </article>
  );
}

function WorkProject({ project }) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#080808] p-2">
        <PortfolioVideo
          src={project.video}
          poster={project.poster}
          label={`${project.title} website walkthrough`}
          className="rounded-md"
        />
      </div>

      <div className="flex min-h-80 flex-col p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#F5EE30]">
              {project.eyebrow}
            </p>
            <h3 className="mt-3 text-3xl font-bold uppercase leading-none sm:text-4xl">
              {project.title}
            </h3>
          </div>
          <span className="text-sm font-bold tracking-[0.24em] text-white/35">
            {project.index}
          </span>
        </div>

        <p className="mt-5 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">
          {project.description}
        </p>
        <div className="mt-6">
          <ScopeList scope={project.scope} />
        </div>
        <ProjectAction project={project} className="mt-auto pt-8" />
      </div>
    </article>
  );
}

export default function PortfolioProjectGallery() {
  const [activeFilter, setActiveFilter] = useState("All");
  const visibleProjects = projects.filter(
    (project) => activeFilter === "All" || project.category === activeFilter,
  );
  const featuredProject = visibleProjects.find((project) => project.featured);
  const secondaryProjects = visibleProjects.filter((project) => !project.featured);

  return (
    <section id="selected-projects" className="px-6 py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
              Projects
            </p>
            <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">
              Selected Work
            </h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter projects">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] ${
                    isActive
                      ? "border-[#F5EE30] bg-[#F5EE30] text-black"
                      : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          {featuredProject ? <FeaturedProject project={featuredProject} /> : null}

          {secondaryProjects.length ? (
            <div
              className={`grid gap-5 ${
                featuredProject ? "mt-12 sm:mt-16" : ""
              } ${secondaryProjects.length > 1 ? "lg:grid-cols-2" : "max-w-2xl"}`}
            >
              {secondaryProjects.map((project) => (
                <WorkProject key={project.id} project={project} />
              ))}
            </div>
          ) : null}

          {!visibleProjects.length ? (
            <p className="py-16 text-center text-gray-400">
              No projects are available in this category yet.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
