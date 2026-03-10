"use client";
import React from "react";
import Image from "next/image";
import AboutAgency from "@/components/marketing/aboutAgency";
import ServicesSection from "@/components/marketing/serviceSlider";
import TestimonialSection from "@/components/marketing/testomonial";
import TeamSlider from "@/components/marketing/teamSlider";
import ManageCompanySection from "@/components/marketing/ManageCompany";
import HeroBackground from "@/components/marketing/HeroBackground";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useEffect, useState } from "react";
import "swiper/css";

const HeroSection = () => {
  const commands = [
    { type: "logo", src: "/s1.png", alt: "Logo 1" },
    { type: "logo", src: "/s2.png", alt: "Logo 2" },
    { type: "logo", src: "/s3.png", alt: "Logo 3" },
    { type: "text", label: "STORIES ON SCREEN" },
    { type: "text", label: "MOHIT CHEMICALS" },
    { type: "logo", src: "/lf.png", alt: "Logo 6" },
  ];

  const words = [
    "DIGITAL INNOVATION!",
    "Storytelling",
    "SEO Excellence",
    "Creative Strategy",
    "Analytics Intelligence",
    "Brand Storytelling",
  ];

  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setIsAnimating(false);
      }, 800);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-glacial text-white bg-black">

      <section className="relative overflow-hidden mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 pt-12 sm:pt-16 md:pt-20 text-center flex items-center justify-start min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[450px]">
        {/* Animated canvas background */}
        <HeroBackground />

        <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <h1 className="text-start font-semibold tracking-wider uppercase">
            <span className="block text-white text-[clamp(1.5rem,6vw,5rem)] leading-[0.9]">
              EMPOWERING BRANDS WITH
            </span>

            {/* SINGLE LIFT-UP TEXT ANIMATION */}
            <span className="block relative h-[1.2em] overflow-hidden text-[clamp(1.5rem,6vw,5rem)] leading-[1] mt-1 sm:mt-2 font-bold text-[#F5EE30]">
              <span
                className="absolute inset-0 flex items-center transition-all duration-[800ms] ease-in-out"
                style={{
                  transform: isAnimating ? 'translateY(-100%)' : 'translateY(0)',
                  opacity: isAnimating ? 0 : 1,
                }}
              >
                {words[index]}
              </span>
            </span>
          </h1>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-black px-4 sm:px-6 md:px-10 lg:px-2 py-4 sm:py-6 md:py-8 justify-start">
        {/* Stats Container */}
        <div className="flex flex-row justify-start items-start gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12 md:mb-16">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 flex-shrink-0">
            <div className="w-full h-full rounded-full p-1.5">
              <div className="w-full h-full flex items-top justify-end">
                <Image
                  src="/home1.svg"
                  alt="Track Icon"
                  width={144}
                  height={144}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl font-glacial-bold uppercase tracking-wide mb-2">
              SMART STRATEGIES, BOLD RESULTS.
            </p>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
              At Digital Corvids, we blend creativity with data to build powerful digital marketing
              <br className="hidden sm:block" />
              campaigns that elevate your brand, engage your audience, and drive real results
              <br className="hidden sm:block" />
              From SEO to social media, we turn ideas into impact
            </p>
          </div>
        </div>


      </section>

      {/* Manage Company Section — Agency OS Showcase */}
      <ManageCompanySection />

      {/* Infinite Image Slider (DC Camp) */}
      <section className="w-full bg-black py-10">
        <div className="text-center max-w-6xl mx-auto px-4 mb-8">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Our Digital Partners
          </p>
        </div>
        <Swiper
          modules={[Autoplay]}
          loop={true}
          speed={3000}
          allowTouchMove={false}
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          slidesPerView={3.5}
          spaceBetween={10}
          breakpoints={{
            480: { slidesPerView: 4.5, spaceBetween: 15 },
            768: { slidesPerView: 5.5, spaceBetween: 20 },
            1024: { slidesPerView: 6.5, spaceBetween: 25 },
            1280: { slidesPerView: 7.5, spaceBetween: 30 },
          }}
          className="dc-camp-slider"
        >
          {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
            <SwiperSlide key={num} className="flex items-center justify-center">
              <div className="relative w-full h-[40px] sm:h-[60px] md:h-[80px] overflow-hidden rounded-xl">
                <Image
                  src={`/dc-camp/${num}.png`}
                  alt={`DC Camp ${num}`}
                  fill
                  className="object-contain hover:scale-105 transition-transform duration-500"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>




      <ServicesSection />
      <AboutAgency />

      {/* New Auto-Width Services Slider */}
      <section className="w-full bg-[#F5EE30] py-4 overflow-hidden">
        <div className="w-full">
          <Swiper
            modules={[Autoplay]}
            loop={true}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            speed={5000}
            allowTouchMove={false}
            slidesPerView="auto"
            spaceBetween={40}
            className="select-none auto-width-services-slider"
          >

            {[
              'SEO',
              'PPC Advertising',
              'Content Marketing',
              'Email Marketing',
              'Influencer Marketing',
              'Social Media Marketing',
              'Web Design',
              'Branding',
            ]
              .concat([
                'SEO',
                'PPC Advertising',
                'Content Marketing',
                'Email Marketing',
                'Influencer Marketing',
                'Social Media Marketing',
                'Web Design',
                'Branding',
              ])
              .concat([
                'SEO',
                'PPC Advertising',
                'Content Marketing',
                'Email Marketing',
                'Influencer Marketing',
                'Social Media Marketing',
                'Web Design',
                'Branding',
                'Agency Management',
              ])
              .map((label, idx) => (
                <SwiperSlide key={`auto-svc-${idx}`} className="flex items-center">
                  <span className="font-etna text-black uppercase flex items-center gap-3 md:gap-4">
                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-none text-black">
                      •
                    </span>
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl leading-tight whitespace-nowrap">
                      {label}
                    </span>
                  </span>
                </SwiperSlide>
              ))}
          </Swiper>
        </div>
      </section>

      <TestimonialSection />

      {/* Commands Slider Moved Here */}
      <section className="bg-black py-12 w-full overflow-hidden">
        <div className="text-center mb-10">
          <p className="text-gray-400 text-lg sm:text-xl font-glacial-bold uppercase tracking-widest">
            Our Digital Companions
          </p>
        </div>
        <div className="w-full">
          <Swiper
            modules={[Autoplay]}
            loop={true}
            speed={6000}
            allowTouchMove={false}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            slidesPerView={2.5}
            spaceBetween={0}
            breakpoints={{
              640: { slidesPerView: 3.5, spaceBetween: 0 },
              1024: { slidesPerView: 5, spaceBetween: 0 },
              1400: { slidesPerView: 6, spaceBetween: 0 },
            }}
            className="companions-slider"
          >
            {commands.concat(commands).concat(commands).map((item, idx) => (
              <SwiperSlide key={idx} className="flex items-center justify-center">
                <div className="flex items-center justify-center h-20 sm:h-24 w-full">
                  {item.type === "logo" ? (
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={80}
                      height={80}
                      className="filter grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300"
                    />
                  ) : (
                    <span
                      className={`
                        text-gray-500 text-lg sm:text-lg uppercase tracking-wide px-2 text-center
                        ${idx % 2 === 0 ? "font-advent" : "font-architects"}
                      `}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
      <TeamSlider />
    </div>
  );
};

export default HeroSection;
