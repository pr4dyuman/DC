import TeamSlider from '@/components/marketing/TeamSlider';
import Image from 'next/image';
import CountUp from '@/components/marketing/CountUp';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">

      {/* Header */}
      <header className="text-center pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12 lg:pb-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider mb-4">
          ABOUT US
        </h1>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12">
        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">
          {/* Left Content */}
          <div className="space-y-6 flex flex-col justify-center px-2 sm:px-4 lg:px-0">
            {/* Section Label */}
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#F5EE30' }}
              ></div>
              <span className="text-xs font-medium tracking-wider text-white">
                ABOUT DIGITAL CORVIDS
              </span>
            </div>

            {/* Main Heading */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-2">
                DIGITAL MARKETING BUILT FOR
              </h2>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-gray-500">
                MEASURABLE GROWTH
              </h2>
            </div>

            {/* Description */}
            <p className="text-gray-300 leading-relaxed text-sm md:text-base lg:text-lg max-w-2xl">
              At Digital Corvids, we combine creative strategy, technical SEO,
              performance marketing, social content, websites, and video
              production to help brands turn attention into measurable business
              growth. Our work is practical, data-aware, and built around the
              outcomes each client needs most.
            </p>

            {/* Experience Box */}
            <div
              className="flex flex-col items-center justify-center text-center py-6 px-10 w-fit mx-auto shadow-lg"
              style={{ backgroundColor: '#F5EE30' }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-1">
                <CountUp end={5} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm font-bold tracking-wider text-black">
                YEARS OF EXPERIENCE
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex flex-col items-center justify-start px-2 sm:px-4 lg:px-0 space-y-6">
            {/* Image (slightly smaller with controlled height) */}
            <div className="w-full max-w-md xl:max-w-lg relative h-[360px] sm:h-[420px] lg:h-[460px]">
              <Image
                src="/about.png"
                alt="Digital Corvids illustration showing a person climbing a ladder next to a large yellow megaphone with floating icons"
                fill
                sizes="(min-width: 1280px) 512px, (min-width: 1024px) 448px, (min-width: 640px) 448px, calc(100vw - 48px)"
                className="object-contain rounded-lg"
              />
            </div>

            {/* Description under Image */}
            <p className="text-gray-300 leading-relaxed max-w-2xl text-sm md:text-base text-center lg:text-left">
              At Digital Corvids, we provide comprehensive digital marketing
              solutions, such as innovative and adaptable. Recognizing that
              every business has unique goals and challenges, we deliver a broad
              spectrum of services designed to help your brand excel in the
              ever-evolving digital arena.
            </p>
          </div>
        </div>

        {/* Full Width Section Below */}
        <div className="mt-10 sm:mt-14 text-left">
          <p className="text-gray-300 leading-relaxed max-w-3xl text-sm md:text-base">
            At Digital Corvids, we don&apos;t just deliver solutions — we innovate,
            adapt, and evolve to meet the ever-shifting demands of the digital
            world. We are resourceful and strategic, always finding the most
            effective path forward to unlock new opportunities and drive your
            success.
          </p>

          {/* Experience Stats Section */}
          <div className="mt-8 sm:mt-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                  <CountUp end={100} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm text-gray-400 tracking-wider font-medium">
                  HAPPY CLIENTS
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                  <CountUp end={50} suffix="L+" />
                </div>
                <div className="text-xs sm:text-sm text-gray-400 tracking-wider font-medium">
                  AD SPENT
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                  <CountUp end={10} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm text-gray-400 tracking-wider font-medium">
                  E-COM PARTNER
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                  <CountUp end={25} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm text-gray-400 tracking-wider font-medium">
                  TEAM MEMBERS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Us Section */}
        <div className="mt-16 sm:mt-20 lg:mt-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* Left Content - Image */}
            <div className="flex flex-col items-center justify-center px-2 sm:px-4 lg:px-0 order-2 lg:order-1">
              <div className="w-full max-w-md xl:max-w-lg relative h-[360px] sm:h-[420px] lg:h-[460px]">
                <Image
                  src="/about2.png"
                  alt="Digital Corvids why us illustration showing a person climbing stairs with trophy and money floating around"
                  fill
                  sizes="(min-width: 1280px) 512px, (min-width: 1024px) 448px, (min-width: 640px) 448px, calc(100vw - 48px)"
                  className="object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Right Content - Text */}
            <div className="space-y-6 flex flex-col justify-center px-2 sm:px-4 lg:px-0 order-1 lg:order-2">
              {/* Section Label */}
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#F5EE30' }}
                ></div>
                <span className="text-xs font-medium tracking-wider text-white">
                  WHY US
                </span>
              </div>

              {/* Main Heading */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-2">
                  WING TO WING
                </h2>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-gray-500">
                  COMMITMENT
                </h2>
              </div>

              {/* Description Paragraphs */}
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed text-sm md:text-base lg:text-lg max-w-2xl">
                  At Digital Corvids, creativity fuels everything we do. We founded this company because we
                  love bringing innovative ideas to life, and digital marketing gives us the perfect opportunity
                  to express our passion for creative work and problem-solving. Whether it&apos;s crafting
                  compelling content or producing creative ad films, we thrive on creating work that
                  captivates and engages audiences.
                </p>

                <p className="text-gray-300 leading-relaxed text-sm md:text-base lg:text-lg max-w-2xl">
                  Our love for tackling complex challenges, paired with our technical expertise, allows us to
                  help small and medium businesses grow and evolve. Beyond just business, we see our work
                  as a way to contribute to something bigger. At our core, we&apos;re creators and problem solvers,
                  and this company gives us the perfect platform to do what we love while making a
                  meaningful impact.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom spacing for mobile */}
      <div className="pb-8 sm:pb-12"></div>
      <div className="bg-black text-white py-16 px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        {/* Left Side - Content */}
        <div>
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-[#F5EE30] rounded-full"></div>
            <span className="text-sm font-semibold text-white tracking-wider">
              OUR OBJECTIVE
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
            THE INTELLIGENCE BEHIND EVERY{" "}
            <span className="text-gray-500">STRATEGY</span>
          </h2>

          {/* Objectives */}
          <div className="mt-10 space-y-8">
            {/* .01 */}
            <div>
              <h3 className="text-3xl font-bold text-[#F5EE30]">.01</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base max-w-2xl">
                At Digital Corvids, our foremost objective is to create job
                opportunities for young minds in the digital marketing industry.
                We aim to nurture fresh talent, equipping them with the skills and
                knowledge needed to thrive in the ever-evolving digital landscape,
                while building a future-ready workforce.
              </p>
            </div>

            {/* .02 */}
            <div>
              <h3 className="text-3xl font-bold text-[#F5EE30]">.02</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base max-w-2xl">
                We are equally committed to driving digital literacy, particularly
                in rural areas, by empowering small and medium businesses and
                young entrepreneurs with the tools they need to succeed in today&apos;s
                digital world.
              </p>
            </div>

            {/* .03 */}
            <div>
              <h3 className="text-3xl font-bold text-[#F5EE30]">.03</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base max-w-2xl">
                Additionally, we prioritise promoting cyber security awareness,
                ensuring businesses can operate safely and securely as they
                embrace digital growth. Through these efforts, we strive to make a
                meaningful impact on the economy and foster a digitally secure and
                inclusive environment.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="flex justify-center lg:justify-end relative w-[280px] h-[280px] md:w-[380px] md:h-[380px] lg:w-[460px] lg:h-[460px] mx-auto lg:mx-0">
          <Image
            src="/about3.png"
            alt="Objective Illustration"
            fill
            sizes="(min-width: 1024px) 460px, (min-width: 768px) 380px, 280px"
            className="object-contain"
          />
        </div>
      </div>
      <TeamSlider />

    </div>
  );
}
