"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

const companionItems = [
  { type: "logo", src: "/s1-360-q88.jpg", alt: "Logo 1" },
  { type: "logo", src: "/s2.png", alt: "Logo 2" },
  { type: "logo", src: "/s3.png", alt: "Logo 3" },
  { type: "text", label: "STORIES ON SCREEN" },
  { type: "text", label: "MOHIT CHEMICALS" },
  { type: "logo", src: "/lf-320-q88.jpg", alt: "Logo 6" },
];

const services = [
  "SEO",
  "PPC Advertising",
  "Content Marketing",
  "Email Marketing",
  "Influencer Marketing",
  "Social Media Marketing",
  "Web Design",
  "Branding",
]
  .concat([
    "SEO",
    "PPC Advertising",
    "Content Marketing",
    "Email Marketing",
    "Influencer Marketing",
    "Social Media Marketing",
    "Web Design",
    "Branding",
  ])
  .concat([
    "SEO",
    "PPC Advertising",
    "Content Marketing",
    "Email Marketing",
    "Influencer Marketing",
    "Social Media Marketing",
    "Web Design",
    "Branding",
    "Agency Management",
  ]);

export function DigitalPartnersSlider() {
  return (
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
              sizes="(min-width: 1280px) 13vw, (min-width: 1024px) 15vw, (min-width: 768px) 18vw, (min-width: 480px) 22vw, 29vw"
              className="object-contain hover:scale-105 transition-transform duration-500"
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export function ServicesTicker() {
  return (
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
      {services.map((label, idx) => (
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
  );
}

export function CompanionsSlider() {
  return (
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
  );
}
