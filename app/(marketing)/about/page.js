import Image from "next/image";

import { ToolLogosSlider } from "@/components/marketing/HomeSliders";
import TeamSlider from "@/components/marketing/TeamSlider";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import PageHero from "@/components/marketing/ui/PageHero";
import { PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import { getMarketingBreadcrumbJsonLd, serializeMarketingJsonLd } from "@/lib/marketing-seo";

// Metadata is in ./layout.js.
const structuredData = [
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]),
];

const moreStats = [
  { label: "E-com partners", value: "10+" },
  { label: "Team members", value: "25+" },
];

const objectives = [
  "Our foremost objective is to create job opportunities for young minds in the digital marketing industry. We aim to nurture fresh talent, equipping them with the skills and knowledge needed to thrive in the ever-evolving digital landscape, while building a future-ready workforce.",
  "We are equally committed to driving digital literacy, particularly in rural areas, by empowering small and medium businesses and young entrepreneurs with the tools they need to succeed in today's digital world.",
  "We also prioritise cyber security awareness, so businesses can operate safely and securely as they embrace digital growth. Through these efforts, we strive to make a meaningful impact on the economy and foster a digitally secure and inclusive environment.",
];

export default function AboutPage() {
  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />

      <PageHero
        eyebrow="About Digital Corvids"
        title="About Us"
        intro={
          <p className="m-0">
            A digital marketing agency in Jaipur. We combine creative strategy, technical SEO, performance marketing,
            social content, websites and video production to help brands turn attention into measurable business growth.
          </p>
        }
        stats={[
          { label: "Happy clients", value: "100+" },
          { label: "Ad spend managed", value: "₹50L+" },
          { label: "Years of experience", value: "5+" },
        ]}
        actions={
          <>
            <ButtonLink href={getMarketingContactHref({ intent: "plan" })} arrow>
              Get a free marketing plan
            </ButtonLink>
            <ButtonLink href="#team" variant="secondary">
              Meet the team
            </ButtonLink>
          </>
        }
      />

      <PageSection labelledBy="about-story" bordered={false}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">Who We Are</p>
            <h2 id="about-story" className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">
              Digital Marketing Built For Measurable Growth
            </h2>
            <div className="mt-6 flex flex-col gap-5 text-base leading-7 text-gray-300 sm:text-lg">
              <p className="m-0">
                Our work is practical, data-aware, and built around the outcomes each client needs most. Recognizing that
                every business has unique goals and challenges, we deliver a broad spectrum of services designed to help
                your brand excel in the ever-evolving digital arena.
              </p>
              <p className="m-0">
                We don&apos;t just deliver solutions: we innovate, adapt, and evolve to meet the ever-shifting demands of
                the digital world. We are resourceful and strategic, always finding the most effective path forward to
                unlock new opportunities and drive your success.
              </p>
            </div>
            <dl className="m-0 mt-8 grid max-w-md grid-cols-2 border-y border-white/10">
              {moreStats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse border-r border-white/10 py-4 pr-4 last:border-r-0 last:pl-4 last:pr-0">
                  <dt className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{stat.label}</dt>
                  <dd className="m-0 text-2xl font-bold tracking-[0.06em] text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/about.png"
              alt="Digital Corvids illustration showing a person climbing a ladder next to a large yellow megaphone with floating icons"
              width={651}
              height={668}
              loading="eager"
              sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 280px"
              className="h-auto w-72 sm:w-96 lg:w-[28rem]"
            />
          </div>
        </div>
      </PageSection>

      <PageSection labelledBy="about-why">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
            <Image
              src="/about2.png"
              alt="Digital Corvids why us illustration showing a person climbing stairs with trophy and money floating around"
              width={655}
              height={582}
              sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 280px"
              className="h-auto w-72 sm:w-96 lg:w-[28rem]"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">Why Us</p>
            <h2 id="about-why" className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">
              Wing To Wing Commitment
            </h2>
            <div className="mt-6 flex flex-col gap-5 text-base leading-7 text-gray-300 sm:text-lg">
              <p className="m-0">
                At Digital Corvids, creativity fuels everything we do. We founded this company because we love bringing
                innovative ideas to life, and digital marketing gives us the perfect opportunity to express our passion
                for creative work and problem-solving. Whether it&apos;s crafting compelling content or producing creative
                ad films, we thrive on creating work that captivates and engages audiences.
              </p>
              <p className="m-0">
                Our love for tackling complex challenges, paired with our technical expertise, allows us to help small and
                medium businesses grow and evolve. Beyond just business, we see our work as a way to contribute to
                something bigger. At our core, we&apos;re creators and problem solvers, and this company gives us the
                perfect platform to do what we love while making a meaningful impact.
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection labelledBy="about-objectives" tone="yellow">
        <SectionIntro id="about-objectives" eyebrow="Our Objectives" title="The Intelligence Behind Every Strategy" tone="yellow" />
        <ol className="m-0 mt-8 grid list-none gap-px overflow-hidden border border-black/15 bg-black/15 p-0 md:grid-cols-3">
          {objectives.map((text, index) => (
            <li key={text} className="bg-[#F5EE30] p-6 sm:p-8">
              <p className="m-0 font-suifak text-4xl leading-none sm:text-5xl">.{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-5 text-sm leading-6 text-black/80 sm:text-base sm:leading-7">{text}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <section aria-labelledby="about-tools" className="bg-black py-14 sm:py-16">
        <h2
          id="about-tools"
          className="m-0 mb-8 text-center font-glacial-bold text-lg uppercase tracking-widest text-gray-400 sm:text-xl"
        >
          Tools We Work With
        </h2>
        <ToolLogosSlider />
      </section>

      <div id="team" className="scroll-mt-6 border-t border-white/10">
        <TeamSlider />
      </div>

      <CtaBand whatsappPath="/about" />
    </main>
  );
}
