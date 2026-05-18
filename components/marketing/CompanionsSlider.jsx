"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const companionItems = [
  { type: "logo", src: "/s1-360-q88.jpg", alt: "Logo 1" },
  { type: "logo", src: "/s2.png", alt: "Logo 2" },
  { type: "logo", src: "/s3.png", alt: "Logo 3" },
  { type: "text", label: "STORIES ON SCREEN" },
  { type: "text", label: "MOHIT CHEMICALS" },
  { type: "logo", src: "/lf-320-q88.jpg", alt: "Logo 6" },
];

export default function CompanionsSlider() {
  const containerRef = useRef(null);
  const swiperRef = useRef(null);
  const syncAutoplayRef = useRef(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isContainerNearViewport = () => {
      const rect = container.getBoundingClientRect();
      return rect.bottom > -200 && rect.top < window.innerHeight + 200;
    };

    let isNearViewport = isContainerNearViewport();

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
        isNearViewport = entry.isIntersecting || isContainerNearViewport();
        syncAutoplay();
      },
      { rootMargin: "200px 0px", threshold: 0.05 },
    );

    observer.observe(container);
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
    <div ref={containerRef}>
      <Swiper
        modules={[Autoplay]}
        loop={true}
        speed={6000}
        allowTouchMove={false}
        autoplay={{
          delay: 0,
          disableOnInteraction: false,
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          syncAutoplayRef.current();
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
        {companionItems.concat(companionItems).concat(companionItems).map((item, idx) => (
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
  );
}
