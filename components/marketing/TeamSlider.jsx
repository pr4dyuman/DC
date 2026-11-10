"use client";
import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Image from "next/image";

import { TeamSliderHeader } from "./TeamSliderHeader";

const teamMembers = [
  { name: "Garima Khurana", role: "Content Writer & Strategist", img: "/garima.webp" },
  { name: "Akash Rinwa", role: "Production Head", img: "/akash.webp" },
  { name: "Tanya Garg", role: "Finance and HR", img: "/tanya.webp" },
  { name: "Divyank Sharma", role: "CEO", img: "/divyank.webp" },
  { name: "Nidhi Indoria", role: "Graphic Designer", img: "/nidhi.webp" },
  { name: "Chandan Sharma", role: "Web Designer & Developer", img: "/chandan.webp" },
  { name: "Aman Vashisth", role: "App Developer", img: "/aman.webp" },
  { name: "Nagendra Indoria", role: "Founder", img: "/nagendra.webp" },
  { name: "Sangam Vashisth", role: "PPC Expert", img: "/sangam.jpeg" }
];

export default function TeamSlider() {
  const sectionRef = useRef(null);
  const swiperRef = useRef(null);
  const syncAutoplayRef = useRef(() => {});

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isSectionNearViewport = () => {
      const rect = section.getBoundingClientRect();
      return rect.bottom > -200 && rect.top < window.innerHeight + 200;
    };

    let isNearViewport = isSectionNearViewport();

    const shouldPlay = () =>
      isNearViewport && document.visibilityState === "visible" && !motionQuery.matches;

    const stopAutoplay = () => {
      swiperRef.current?.autoplay?.stop();
    };

    const syncAutoplay = () => {
      const swiper = swiperRef.current;
      if (!swiper?.autoplay) return;

      if (shouldPlay()) {
        swiper.autoplay.start();
      } else {
        swiper.autoplay.stop();
      }
    };

    syncAutoplayRef.current = syncAutoplay;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearViewport = entry.isIntersecting || isSectionNearViewport();
        syncAutoplay();
      },
      { rootMargin: "200px 0px", threshold: 0.05 },
    );

    observer.observe(section);
    document.addEventListener("visibilitychange", syncAutoplay);

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", syncAutoplay);
    } else {
      motionQuery.addListener(syncAutoplay);
    }

    syncAutoplay();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncAutoplay);

      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener("change", syncAutoplay);
      } else {
        motionQuery.removeListener(syncAutoplay);
      }

      syncAutoplayRef.current = () => {};
      stopAutoplay();
    };
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="team-heading" className="bg-black py-14 sm:py-16 lg:py-20">
      <TeamSliderHeader />

      {/* Swiper Slider */}
      <div className="relative mx-auto max-w-[var(--site-frame)] px-[var(--site-gutter)]">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          loop={true}
          speed={800}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            syncAutoplayRef.current();
          }}
          spaceBetween={16}
          slidesPerView={1.3}
          pagination={{ clickable: true }}
          breakpoints={{
            480: {
              slidesPerView: 1.5,
              spaceBetween: 16,
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 2.5,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 3.5,
              spaceBetween: 28,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 32,
            },
          }}
          className="team-swiper"
        >
          {teamMembers.map((member, idx) => (
            <SwiperSlide key={idx}>
              <div className="group relative overflow-hidden bg-zinc-900 h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px]">
                {/* Image Container */}
                <div className="relative w-full h-full overflow-hidden">
                  <Image
                    src={member.img}
                    alt={member.name}
                    width={400}
                    height={500}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  {/* Gradient Overlay - Black by default, #F5EE30 on hover */}
                  <div className="absolute inset-0 transition-all duration-300 pointer-events-none group-hover:opacity-90 group-hover:bg-gradient-to-t group-hover:from-[#F5EE30] group-hover:via-[#F5EE30]/30 group-hover:to-transparent bg-gradient-to-t from-black via-black/60 to-transparent opacity-80"></div>
                </div>
                {/* Name Centered at Bottom */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-7 text-center w-full">
                  <span className="text-lg sm:text-xl md:text-xl text-white uppercase tracking-wide mb-1 whitespace-nowrap font-glacial-bold block mx-auto">
                    {member.name}
                  </span>

                  <p className="text-sm sm:text-base text-white font-small">
                    {member.role}
                  </p>
                </div>
                {/* Hover Border Effect */}

              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Swiper Pagination Dots */}
        <div className="flex justify-center mt-5">
          <div className="swiper-pagination team-swiper-pagination !static" />
        </div>
      </div>

    </section>
  );
}
