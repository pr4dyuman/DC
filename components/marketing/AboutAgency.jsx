import Image from "next/image";
import Link from "next/link";
import CountUp from "./CountUp";

export default function AboutAgency() {
  return (
    <section className="bg-black text-white min-h-screen py-8 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-[#F5EE30] text-xs sm:text-sm font-glacial-bold tracking-wide mb-3 sm:mb-4">
            ● ABOUT AGENCY
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
            BECOME PART OF THE WINNING CIRCLE
            <br className="hidden sm:block" />
            <span className="sm:inline"> </span>BY WORKING WITH OUR TALENTED
            <br className="hidden sm:block" />
            <span className="sm:inline"> </span>
            <span className="text-[#F5EE30]">CREATIVE TEAM.</span>
          </h2>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-start mt-8 sm:mt-12 md:mt-16">
          {/* Left Side - Stats + Button + Description */}
          <div className="space-y-8 sm:space-y-10 md:space-y-12 relative mt-8 lg:mt-0">
            {/* Stat 1 */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  <CountUp end={100} suffix="+" />
                </p>
                <p className="text-[#F5EE30] text-xs sm:text-sm font-glacial-bold tracking-wide">
                  HAPPY CUSTOMERS
                </p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  <CountUp end={50} suffix="L+" />
                </p>
                <p className="text-[#F5EE30] text-xs sm:text-sm font-glacial-bold tracking-wide">
                  AD SPENTS
                </p>
              </div>
            </div>

            {/* Button with Line */}
            <div className="relative flex justify-end items-center h-32 sm:h-36 md:h-40 bg-black">
              {/* White Line */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-white w-[calc(100%-6rem)] sm:w-[calc(100%-7rem)] md:w-[calc(100%-8rem)]"></div>

              <Link href="/contact" className="z-10">
                <div className="group relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden transition-all duration-500 hover:scale-110 hover:shadow-2xl cursor-pointer">
                  <span className="relative z-10 transition-colors duration-500 group-hover:text-black text-center font-glacial-bold leading-tight">
                    EXPLORE
                    <br />
                    MORE
                  </span>
                  <div className="absolute inset-0 bg-[#F5EE30] scale-0 rounded-full transition-transform duration-500 group-hover:scale-100"></div>
                </div>
              </Link>
            </div>

            {/* Description */}
            <div className="max-w-md space-y-3 sm:space-y-4">
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                At Digital Corvids, we don&apos;t just deliver solutions –
                we innovate, adapt, and evolve to meet the ever-shifting
                demands of the digital world. We are agile and strategic,
                always finding the most effective path forward to unlock new
                opportunities and drive your success.
              </p>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className="relative flex justify-center items-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[500px]">
            <Image
              src="/agency-900.png"
              alt="Creative team illustration with gears"
              width={600}
              height={600}
              className="w-full max-w-sm sm:max-w-md lg:max-w-lg h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
