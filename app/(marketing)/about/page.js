import Image from "next/image";

import CountUp from "@/components/marketing/CountUp";
import { ToolLogosSlider } from "@/components/marketing/HomeSliders";
import TeamSlider from "@/components/marketing/TeamSlider";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import PageHero from "@/components/marketing/ui/PageHero";
import { Eyebrow, PageSection, TwoToneTitle } from "@/components/marketing/ui/PageSection";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import { getMarketingBreadcrumbJsonLd, serializeMarketingJsonLd } from "@/lib/marketing-seo";

// Metadata is in ./layout.js.
const structuredData = [
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]),
];

// The figures the homepage also shows, plus two more about the team.
const stats = [
  { label: "Happy clients", end: 100, suffix: "+" },
  { label: "Ad spend managed", end: 50, prefix: "₹", suffix: "L+" },
  { label: "E-com partners", end: 10, suffix: "+" },
  { label: "Team members", end: 25, suffix: "+" },
];

const objectives = [
  "Our foremost objective is to create job opportunities for young minds in the digital marketing industry. We aim to nurture fresh talent, equipping them with the skills and knowledge needed to thrive in the ever-evolving digital landscape, while building a future-ready workforce.",
  "We are equally committed to driving digital literacy, particularly in rural areas, by empowering small and medium businesses and young entrepreneurs with the tools they need to succeed in today's digital world.",
  "We also prioritise cyber security awareness, so businesses can operate safely and securely as they embrace digital growth. Through these efforts, we strive to make a meaningful impact on the economy and foster a digitally secure and inclusive environment.",
];

const sectionHeading = "mt-5 text-4xl font-bold uppercase leading-[1.02] sm:text-5xl xl:text-6xl";

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
            <Eyebrow>Who We Are</Eyebrow>
            <h2 id="about-story" className={sectionHeading}>
              <TwoToneTitle title="Digital Marketing Built For" accent="Measurable Growth" />
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
            {/* The yellow experience box from the original page */}
            <div className="mt-8 inline-flex flex-col items-center justify-center bg-[#F5EE30] px-10 py-6 text-center text-black shadow-lg">
              <span className="text-4xl font-bold sm:text-5xl">
                <CountUp end={5} suffix="+" />
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider sm:text-sm">Years of experience</span>
            </div>
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

        <dl className="m-0 mt-14 grid grid-cols-2 gap-y-10 border-y border-white/10 py-10 sm:mt-16 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse items-center text-center">
              <dt className="mt-3 text-xs font-medium uppercase tracking-wider text-gray-400 sm:text-sm">{stat.label}</dt>
              <dd className="m-0 text-4xl font-bold text-white sm:text-5xl md:text-6xl">
                <CountUp end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection labelledBy="about-why" bordered={false}>
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
            <Eyebrow>Why Us</Eyebrow>
            <h2 id="about-why" className={sectionHeading}>
              <TwoToneTitle title="Wing To Wing" accent="Commitment" />
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

      <PageSection labelledBy="about-objectives">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Eyebrow>Our Objectives</Eyebrow>
            <h2 id="about-objectives" className={sectionHeading}>
              <TwoToneTitle title="The Intelligence Behind Every" accent="Strategy" />
            </h2>
            <ol className="m-0 mt-8 flex list-none flex-col gap-7 p-0">
              {objectives.map((text, index) => (
                <li key={text} className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-white/10 pb-7 last:border-b-0 last:pb-0">
                  <span className="font-suifak text-3xl leading-none text-[#F5EE30] sm:text-4xl">
                    .{String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="m-0 text-base leading-7 text-gray-300">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/about3.png"
              alt="Illustration of a strategist ticking off a checklist on a yellow clipboard"
              width={510}
              height={684}
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 240px"
              className="h-auto w-60 sm:w-80 lg:w-96"
            />
          </div>
        </div>
      </PageSection>

      <section aria-labelledby="about-tools" className="border-t border-white/10 bg-black py-14 sm:py-16">
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
