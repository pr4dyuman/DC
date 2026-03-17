"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";

import Link from "next/link";

export default function PPCAdvertising() {
  const btnRef = useRef(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    let xForce = 0, yForce = 0;
    let isHovered = false;
    let animationFrame;

    const handleMouseMove = (e) => {
      if (!isHovered) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);

      xForce = x * 2.5;
      yForce = y * 2.5;

      const fill = btn.querySelector('.fill-effect');
      if (fill) {
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        fill.style.left = `${relX}px`;
        fill.style.top = `${relY}px`;
      }
    };

    const handleMouseEnter = () => {
      isHovered = true;
      const fill = btn.querySelector('.fill-effect');
      if (fill) {
        fill.style.opacity = '1';
        fill.style.transform = 'scale(30)';
      }
    };

    const handleMouseLeave = () => {
      isHovered = false;

      const gsapTo = (element, props) => {
        Object.keys(props).forEach(key => {
          if (key === 'duration' || key === 'ease') return;
          element.style.transform = `translate(${props.x || 0}px, ${props.y || 0}px) scale(${props.scale || 1}) rotateZ(${props.rotateZ || 0}deg)`;
        });
      };

      gsapTo(btn, {
        x: 0,
        y: 0,
        scale: 1,
        rotateZ: 0,
        duration: 0.3,
        ease: 'power2.out'
      });

      const fill = btn.querySelector('.fill-effect');
      if (fill) {
        fill.style.opacity = '0';
        fill.style.transform = 'scale(0.1)';
      }
    };

    const update = () => {
      if (isHovered) {
        const shake = 20;
        const shakeX = (Math.random() - 0.5) * shake;
        const shakeY = (Math.random() - 0.5) * shake;

        btn.style.transform = `translate(${xForce + shakeX}px, ${yForce + shakeY}px) scale(1.2) rotateZ(${(Math.random() - 0.5) * 5}deg)`;
        btn.style.transformPerspective = '1000px';
      }

      animationFrame = requestAnimationFrame(update);
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseenter', handleMouseEnter);
    btn.addEventListener('mouseleave', handleMouseLeave);

    update();

    return () => {
      cancelAnimationFrame(animationFrame);
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseenter', handleMouseEnter);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Header Section */}
          <div className="text-center pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12 lg:pb-16 mb-16">
            <Link href="/services">
              <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-3 sm:mb-4 cursor-pointer">
                SERVICES
              </h2>
            </Link>
            <p className="text-white font-glacial-bold text-sm md:text-base uppercase tracking-wider">
              <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
                SERVICES
              </Link>
              <span className="text-gray-500 mx-2">|</span>
              <span className="text-[#3E3E3E] font-glacial-bold">PAY-PER-CLICK (PPC) ADVERTISING</span>
            </p>
          </div>

          {/* First Section - PPC Advertising */}
          <div className="flex flex-col lg:flex-row items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
            {/* Left - Image */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc1.svg"
                  alt="PPC Advertising"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Right - Text Content */}
            <div className="w-full lg:w-1/2">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 uppercase tracking-wide flex items-start">
                <span className="w-2 h-2 sm:w-3 sm:h-3 bg-[#F5EE30] rounded-full mr-2 sm:mr-3 mt-1 sm:mt-1.5 flex-shrink-0"></span>
                <span className="leading-relaxed whitespace-normal xl:whitespace-nowrap">Get Instant Visibility, Drive Qualified Traffic, and Maximize ROI</span>
              </h3>
              <h2 className="text-2xl sm:text-4xl md:text-2xl lg:text-3xl xl:text-4xl font-['Etna'] font-bold mb-4 sm:mb-6 text-[#F5EE30] whitespace-nowrap">
                PAY-PER-CLICK (PPC) ADVERTISING
              </h2>
              <p className="text-lg sm:text-xl font-glacial-bold mb-3 sm:mb-4 text-white">OUR MISSION</p>
              <p className="text-white mb-4 sm:mb-6 leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
                To deliver high-impact PPC campaigns that put your business in front of the right audience at the right time. We combine strategic targeting, compelling ad copy, and continuous optimization to turn every click into a valuable conversion.
              </p>
              <p className="text-lg sm:text-xl font-glacial-bold mb-3 sm:mb-4 text-white font-['Etna']">OUR VISION</p>
              <p className="text-white leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
                To revolutionize digital advertising by creating transparent, data-driven PPC campaigns that consistently outperform industry benchmarks and deliver measurable business growth.
              </p>
            </div>
          </div>

          {/* Second Section - Strategic Campaign Planning */}
          <div className="flex flex-col lg:flex-row-reverse items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
            {/* Right - Image */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px]">
                <Image
                  src="/ppc2.svg"
                  alt="Strategic Campaign Planning"
                  width={500}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Left - Text Content */}
            <div className="w-full lg:w-1/2">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 sm:w-3 sm:h-3 bg-[#F5EE30] rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm md:text-base font-glacial-bold leading-relaxed text-white">
                  We don&apos;t guess—we analyze, optimize, and dominate. Your goals, our blueprint for success.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-['Etna'] leading-tight">
                <span className="block text-white">STRATEGIC</span>
                <span className="block text-[#3E3E3E]">CAMPAIGN PLANNING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Comprehensive keyword research and competitor analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Custom campaign architecture tailored to your goals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Audience segmentation and persona targeting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Budget allocation strategies for maximum impact</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Conversion funnel mapping and optimization</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Ad Creation & Copywriting Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Image */}
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc3.svg"
                  alt="Ad Creation & Copywriting"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
            {/* Right - Text */}
            <div className="w-full">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Ads that stop scrolls, spark curiosity, and force clicks.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">AD CREATION</span><br />
                <span className="text-[#3E3E3E]">& COPYWRITING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>High-converting ad copy that speaks to user intent</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Eye-catching display ads and responsive search ads</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>A/B testing of headlines, descriptions, and CTAs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Ad extensions setup (sitelinks, callouts, structured snippets)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Landing page recommendations for better Quality Scores</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Platform Mastery Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image - Top on mobile, Right on desktop */}
            <div className="w-full flex justify-center order-1 lg:order-2">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc4.svg"
                  alt="Platform Mastery"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Text - Bottom on mobile, Left on desktop */}
            <div className="w-full order-2 lg:order-1">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Google, Meta, TikTok, LinkedIn—we conquer every advertising arena with data-driven precision.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">PLATFORM</span><br />
                <span className="text-[#3E3E3E]">MASTERY</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Google Ads (Search, Display, Shopping, YouTube)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Microsoft Advertising (Bing Ads)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Facebook & Instagram Ads</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>LinkedIn Ads for B2B targeting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Amazon Advertising and other e-commerce platforms</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bid Management & Optimization Section */}
          <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left - Image */}
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc5.svg"
                  alt="Bid Management & Optimization"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
            {/* Right - Text */}
            <div className="w-full">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  Smart bids, smarter results. We outplay algorithms to lower costs and boost profits.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">BID MANAGEMENT</span><br />
                <span className="text-gray-400">& OPTIMIZATION</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Automated and manual bidding strategies</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Real-time bid adjustments based on performance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Device, location, and time-of-day bid optimization</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Negative keyword management to reduce wasted spend</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Quality Score improvement for lower CPCs</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transparent Analytics & Reporting Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image - Top on mobile, Right on desktop */}
            <div className="w-full flex justify-center order-1 lg:order-2">
              <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
                <Image
                  src="/ppc6.svg"
                  alt="Transparent Analytics & Reporting"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Text - Bottom on mobile, Left on desktop */}
            <div className="w-full order-2 lg:order-1">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="w-2 h-2 bg-[#F5EE30] rounded-full mt-1 flex-shrink-0"></span>
                <span className="uppercase tracking-wide sm:tracking-widest text-xs sm:text-sm text-white font-glacial-bold leading-relaxed">
                  No vanity metrics—just hard data that proves your ROI.
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold leading-tight mb-4 sm:mb-6">
                <span className="text-white">TRANSPARENT</span><br />
                <span className="text-gray-400">ANALYTICS & REPORTING</span>
              </h2>
              <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Custom dashboards tracking key performance metrics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Weekly and monthly performance reports with actionable insights</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Conversion tracking and attribution modeling</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>ROI and ROAS (Return on Ad Spend) analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                  <span>Ongoing recommendations for campaign improvements</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Why Choose Us Section */}
        <div className="bg-black text-white w-full">

          {/* Title */}
          <h2
            className="text-3xl md:text-4xl font-bold text-center text-black py-4"
            style={{ backgroundColor: "#F5EE30" }}
          >
            WHY CHOOSE US
          </h2>

          {/* Features Section */}
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-6 text-center py-10 px-4">

            {/* Card 1 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                ROI Obsession
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We&apos;ve driven over $15 million in client revenue from paid ads, with every campaign oriented toward measurable returns and tangible business growth.
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                No Lock-Ins
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We offer flexible contracts because we&apos;re confident in our results—our client relationships are built on performance, not paperwork.
              </p>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Speed Demon Launches
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                Our streamlined process gets your campaigns live in 72 hours or less, letting you capitalize on market opportunities faster than competitors.
              </p>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Fraud Protection
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We implement advanced click fraud monitoring and budget safeguards to ensure your ad spend reaches real potential customers, not bots.
              </p>
            </div>

            {/* Card 5 */}
            <div className="flex flex-col items-center px-2">
              <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
                Unlimited A/B Testing
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
                We continuously test ad variations, landing pages, and audience segments to maximize performance—we never settle for &quot;good enough.&quot;
              </p>

            </div>

          </div>


          {/* Transform Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 px-6 md:px-16 pb-12 mt-4">

            <div className="text-center md:text-left max-w-xl">
              <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
                READY TO DOMINATE <br />
                <span className="text-gray-400">GOOGLE SEARCH RESULTS?</span>
              </h3>
              <p className="text-sm md:text-base mt-3 text-gray-400 leading-relaxed">
                Let&apos;s discuss how our proven SEO strategies can help you outrank competitors and drive qualified organic traffic.
              </p>
            </div>

            {/* Circle Button */}
            <div className="flex justify-center md:justify-end">
              <a href="/get-started" class="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


