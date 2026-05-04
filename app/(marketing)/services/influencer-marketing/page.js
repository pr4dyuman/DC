"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";


import { gsap } from "gsap";
import Link from "next/link";

export default function SocialMediaMarketing() {

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

    // More aggressive movement
    xForce = x * 2.5;
    yForce = y * 2.5;

    // Update white fill position
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
    
    // Fast reset with bounce
    gsap.to(btn, {
      x: 0,
      y: 0,
      scale: 1,
      rotateZ: 0,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Hide fill effect
    const fill = btn.querySelector('.fill-effect');
    if (fill) {
      fill.style.opacity = '0';
      fill.style.transform = 'scale(0.1)';
    }
  };

  const update = () => {
    if (isHovered) {
      const shake = 20; // Increased shake intensity
      const shakeX = (Math.random() - 0.5) * shake;
      const shakeY = (Math.random() - 0.5) * shake;

      gsap.set(btn, {
        x: xForce + shakeX,
        y: yForce + shakeY,
        scale: 1.2, // Bigger scale on hover
        transformPerspective: 1000,
        rotateZ: (Math.random() - 0.5) * 5, // Slightly more rotation
      });
    }
    
    animationFrame = requestAnimationFrame(update);
  };

  // Add event listeners to the button only
  btn.addEventListener('mousemove', handleMouseMove);
  btn.addEventListener('mouseenter', handleMouseEnter);
  btn.addEventListener('mouseleave', handleMouseLeave);
  
  // Start the animation loop
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8  w-full">
        {/* Header Section */}
        <div className="text-center pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12 lg:pb-16 mb-16">
              <Link href="/services">
                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4 cursor-pointer">
                  SERVICES
                </h2>
              </Link>

              <p className="text-white font-bold text-sm md:text-base uppercase tracking-wider">
            <Link href="/services" className="text-white hover:text-[#F5EE30] transition-colors">
              SERVICES
            </Link>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-[#3E3E3E] font-glacial-bold">Influencer-Marketing</span>
            </p>
            </div>
        {/* First Section - Social Media Marketing */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
          {/* Left - Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/inf1.svg"
                alt="Social Media Marketing"
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
              <span className="leading-relaxed whitespace-normal font-glacial-bold xl:whitespace-nowrap">Amplify Your Brand with Authentic Voices that Drive Action</span>
            </h3>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-['Etna'] font-bold mb-4 sm:mb-6 text-[#F5EE30] uppercase whitespace-nowrap">
              Influencer Marketing
            </h1>
            <p className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">OUR MISSION</p>
            <p className="text-white mb-4 sm:mb-6 leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
              To empower businesses by transforming social media into a powerhouse of engagement, loyalty, and revenue. We craft data-backed strategies that turn followers into brand advocates and scrolls into sales.
            </p>
            <p className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white font-glacial-bold">OUR VISION</p>
            <p className="text-white leading-relaxed text-base sm:text-lg font-['Glacial_Indifference']">
              To redefine social media as a dynamic ecosystem for authentic human connection, where brands thrive through creativity, agility, and measurable impact.
            </p>
          </div>
        </div>

        {/* Second Section - Organic Social Media Growth */}
        <div className="flex flex-col lg:flex-row-reverse items-center justify-between mb-16 sm:mb-20 lg:mb-32 gap-8 lg:gap-12">
          {/* Right - Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px]">
              <Image
                src="/smm2.svg"
                alt="Organic Social Media Growth"
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
               We find the right voices—not just the loudest ones. Your brand deserves perfect alignment.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-['Etna']  uppercase leading-tight">
              <span className="block text-white">Influencer</span>
              <span className="block text-[#3E3E3E]"> Discovery & Vetting</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Platform-specific strategy (Instagram, LinkedIn, Facebook, X, Pinterest)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Viral-worthy content calendars (posts, reels, stories, carousels)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Community management and real-time engagement</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Hashtag research and trend-jacking (the right way)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>User-generated content (UGC) campaigns to amplify authenticity</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Paid Social Advertising Section */}
        <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm3.svg"
                alt="Paid Social Advertising"
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
                From brief to brilliance—we design campaigns that feel natural, not salesy.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna'] font-extrabold  uppercase leading-tight mb-4 sm:mb-6">
              <span className="text-white">Campaign Strategy </span><br />
              <span className="text-[#3E3E3E]">& Storytelling</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Campaign setup and optimization (Meta Ads, Pinterest Ads, LinkedIn Ads)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Audience segmentation and lookalike targeting</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Retargeting campaigns to recover lost leads</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>A/B testing for ad creatives, copy, and CTAs</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Influencer-collaboration ads for trusted social proof</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Creation & Storytelling Section */}
        <div className="mb-16 sm:mb-20 lg:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - Top on mobile, Right on desktop */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm4.svg"
                alt="Content Creation & Storytelling"
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
                Creator content that works harder—repurposed across ads, websites, and beyond.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna']  uppercase font-extrabold leading-tight mb-4 sm:mb-6">
              <span className="text-white">Content</span><br />
              <span className="text-[#3E3E3E]">Collaboration</span><br />
              <span className="text-[#3E3E3E]">& Amplification</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Creative concept development and mood boards</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>High-quality photo/video shoots for social feeds</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Meme culture integration (brand-safe and relatable)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Caption writing that blends brand voice with platform trends</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>GIFs, stickers, and AR filters for interactive engagement</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Social Analytics & Performance Optimization Section */}
        <div className="mb-16 sm:mb-20 lg:mb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[350px] md:max-w-[400px] lg:max-w-[450px]">
              <Image
                src="/smm5.svg"
                alt="Social Analytics & Performance Optimization"
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
                We measure what matters—sales, not just likes.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['Etna']  uppercase font-extrabold leading-tight mb-4 sm:mb-6">
              <span className="text-white">Performance</span><br />
              <span className="text-gray-400">Analytics & ROI</span><br />
              <span className="text-gray-400">Tracking</span>
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-white text-base sm:text-lg font-['Glacial_Indifference']">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Monthly performance reports (engagement, reach, conversions)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Competitor benchmarking and gap analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Sentiment analysis to gauge brand perception</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>ROI tracking for paid and organic efforts</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-2 sm:mr-3 flex-shrink-0">•</span>
                <span>Platform algorithm updates and pivot strategies</span>
              </li>
            </ul>
          </div>
        </div>
        </div>
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
              Creator Network
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Access to 10,000+ pre-vetted influencers across all niches and industries, ensuring we can match your brand with the perfect voice regardless of your target audience.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              No Middlemen
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
             We facilitate direct relationships between brands and creators, eliminating unnecessary layers that slow down execution and inflate costs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              Crisis Management
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Our team provides rapid response to PR risks or misaligned content, with protocols in place to protect your brand reputation at all times.
            </p>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              Scalability
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              Whether you need local nano-influencers for grassroots campaigns or global celebrity partnerships, we scale our approach to match your ambitions and budget.
            </p>
          </div>

          {/* Card 5 */}
          <div className="flex flex-col items-center px-2">
            <h3 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide">
              Proven ROI
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-2 leading-relaxed max-w-[200px]">
              85% of our influencer campaigns exceed client KPIs, with transparent reporting that connects creator activity directly to your bottom line.
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
              <p className='text-sm md:text-base mt-3 text-gray-400 leading-relaxed'>
  Let&apos;s discuss how our proven SEO strategies can help you outrank competitors and drive qualified organic traffic.
</p>

            </div>

            {/* Circle Button */}
            <div className="flex justify-center md:justify-end">
              <a href="/get-started" className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
            </div>
          </div>
                </div>
               
      <div className="bg-black text-white w-full py-10">
  <h2
    className="text-3xl md:text-4xl font-bold text-center text-black py-4"
    style={{ backgroundColor: "#F5EE30" }}
  >
    STATS THAT MATTER
  </h2>

  <div className="relative w-full flex flex-col items-center justify-center px-6 py-12">
    <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:justify-between text-center gap-10">

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          Average 8:1 ROI on influencer campaigns in 2023.
        </p>
        <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
      </div>

      {/* Divider (Desktop Only) */}
      <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          70% of clients see a 3x boost in social engagement.
        </p>
        <div className="w-full md:hidden h-[2px] bg-[#F5EE30] mt-4"></div>
      </div>

      {/* Divider (Desktop Only) */}
      <div className="hidden md:block w-[2px] h-16 bg-[#F5EE30]"></div>

      {/* Stat */}
      <div className="flex flex-col items-center flex-1">
        <p className="text-sm md:text-base font-light text-gray-300 leading-relaxed">
          50+ viral campaigns (1M+ views) launched last year.
        </p>
      </div>

    </div>

    <div className="absolute right-8 top-10 hidden md:block">
      <span className="text-[#F5EE30] text-6xl font-bold">”</span>
    </div>
  </div>
</div>


      </main>
      
    </div>
  );
}


