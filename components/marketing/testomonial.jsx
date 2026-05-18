'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function TestimonialSection() {
  const sectionRef = useRef(null);
  const swiperRef = useRef(null);
  const syncAutoplayRef = useRef(() => {});
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/testimonial?status=active');
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data.data || []);
      } else {
        setError('Failed to load testimonials');
      }
    } catch (err) {
      console.error('Error fetching testimonials:', err);
      setError('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isNearViewport = false;

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
        isNearViewport = entry.isIntersecting;
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
  }, [testimonials.length]);

  if (loading) {
    return (
      <section className="bg-black text-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">Loading testimonials...</p>
        </div>
      </section>
    );
  }

  if (error || testimonials.length === 0) {
    return null; // Don't show section if no testimonials
  }

  return (
    <section ref={sectionRef} className="bg-black text-white py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="text-white text-lg font-glacial-bold tracking-wider">TESTIMONIAL</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold mb-2">HAPPY CLIENT</h2>
            <h3 className="text-5xl lg:text-6xl font-bold text-gray-600">FEEDBACK</h3>
          </div>

          <div className="max-w-md">
            <h4 className="text-base font-glacial-bold mb-3 tracking-wide">TRUSTED BY YOU, DRIVEN BY RESULTS</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trust powers our creativity. At Digital Corvids, every win is a shared one—thank you for letting us be part of your story.
            </p>
          </div>
        </div>

        {/* Swiper Slider */}
        <Swiper
          modules={[Pagination, Autoplay]}
          slidesPerView={1}
          spaceBetween={30}
          loop={true}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            syncAutoplayRef.current();
          }}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            768: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
          className="dc-testimonial-swiper"
        >
          {testimonials.map((testimonial, index) => (
            <SwiperSlide key={index}>
              <div className="bg-black p-8 rounded-lg h-full flex flex-col">
                {/* Icon */}
                <div className="mb-6">
                  <Image
                    src="/Frame.svg"
                    alt="Quote"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                    unoptimized
                  />
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-300 text-sm leading-relaxed mb-8 flex-grow">
                  &quot;{testimonial.text}&quot;
                </p>

                {/* Author Info */}
                <div>
                  <h5 className="text-white text-xs font-bold mb-1">{testimonial.name}</h5>
                  <p className="text-[#F5EE30] text-xs font-medium">{testimonial.company}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </section>
  );
}
