"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay } from "swiper/modules"
import "swiper/css"
import Link from "next/link"
import Image from "next/image"

const ServicesSection = () => {
  const servicesData = [
    {
      id: "01",
      title: "Web",
      titleHighlight: "development",
      image: "/web3.svg",
      description:
        "Your website is your digital storefront. We build fast, secure, and user-friendly sites optimized for maximum conversions.",
      link: "/services/web-development",
      gradientColor: "#F5EE30",
    },
    {
      id: "02",
      title: "Search engine",
      titleHighlight: "optimization",
      image: "/web4.svg",
      description:
        "Drive organic growth. We optimize your site to rank higher, attract traffic, and convert visitors.",
      link: "/services/seo",
      gradientColor: "#F5EE30",
    },
    {
      id: "03",
      title: "Social Media",
      titleHighlight: "marketing",
      image: "/smm1.svg",
      description:
        "Build a loyal audience and amplify your brand's voice across platforms like Facebook, Instagram, LinkedIn, and Pinterest.",
      link: "/services/social-media-marketing",
      gradientColor: "#F5EE30",
    },
    {
      id: "04",
      title: "Video & Ad",
      titleHighlight: "Production",
      image: "/vpd1.svg",
      description:
        "We craft high-quality, compelling videos that tell your brand's story, drive engagement, and convert viewers into customers.",
      link: "/services/video-production-ad",
      gradientColor: "#F5EE30",
    },
    {
      id: "05",
      title: "PPC",
      titleHighlight: "Advertising",
      image: "/ppc1.svg",
      description:
        "Gain instant visibility. We create targeted ad campaigns that maximize ROI and minimize wasted spend.",
      link: "/services/ppc",
      gradientColor: "#F5EE30",
    },
    {
      id: "06",
      title: "Influencer",
      titleHighlight: "Marketing",
      image: "/inf1.svg",
      description: "Partner with influencers who align with your brand to reach highly engaged audiences and build authentic trust.",
      link: "/services/influencer-marketing",
      gradientColor: "#F5EE30",
    },
  ]

  return (
    <div className="bg-black min-h-auto">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12 lg:mb-16">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm"></div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">Services</h2>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 sm:gap-8 lg:gap-10">
          <div className="lg:w-2/3">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white uppercase leading-tight">
              <span className="text-white block">Your Growth Fuelled By</span>
              <span className="text-[#3d3d3d] block">Our Expertise</span>
            </h3>
          </div>

          <div className="lg:w-1/3">
            <p className="text-gray-300 text-sm lg:text-base leading-relaxed">
              A brief overview of all the services we provide as a digital marketing agency. Clicking the learn more
              button will lead to each service's individual page.
            </p>
          </div>
        </div>
      </div>

      {/* Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-50"></div>
        <Image
          src="/ssbg.jpeg"
          alt="Background"
          width={1920}
          height={900}
          className="w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px] xl:h-[900px] object-cover filter grayscale opacity-50"
        />

        {/* Swiper Section */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full mx-auto relative">
            <Swiper
              modules={[Autoplay]}
              loop={true}
              centeredSlides={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              breakpoints={{
                0: {
                  slidesPerView: 1.15,
                  spaceBetween: 10,
                },
                480: {
                  slidesPerView: 1.2,
                  spaceBetween: 12,
                },
                640: {
                  slidesPerView: 1.5,
                  spaceBetween: 15,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 18,
                },
                1024: {
                  slidesPerView: 2.5,
                  spaceBetween: 25,
                },
                1280: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                },
              }}
              className="w-full overflow-visible relative"
              style={{ padding: "0 10px" }}
            >
              {servicesData.map((service) => (
                <SwiperSlide
                  key={service.id}
                  className="transition-all duration-300 ease-in-out border-l border-r border-white/30 overflow-visible group h-full"
                >
                  <Link href={service.link} className="block text-white no-underline h-full">
                    <div className="relative p-4 md:p-5 lg:p-6 xl:p-8 z-10 h-full flex flex-col justify-between">
                      {/* Overlay - Black by default; #F5EE30 on hover */}
                      <div className="pointer-events-none absolute inset-0 z-0 transition-all duration-300 group-hover:opacity-90 group-hover:bg-gradient-to-t group-hover:from-[#F5EE30] group-hover:via-[#F5EE30]/30 group-hover:to-transparent bg-gradient-to-t from-black via-black/60 to-transparent opacity-80"></div>
                      <div className="relative z-10 flex flex-col h-full">
                        {/* ID + Title */}
                        <div className="mb-3 md:mb-4 lg:mb-5">
                          <p className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white uppercase">
                            .{service.id}
                          </p>
                          <h4 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl font-bold uppercase font-etna leading-tight">
                            <span className="block text-white">{service.title}</span>
                            <span className="text-[#F5EE30]">{service.titleHighlight}</span>
                          </h4>
                        </div>

                        {/* Image */}
                        <div className="flex justify-center mb-3 md:mb-4 lg:mb-5 flex-grow">
                          <Image
                            src={service.image || "/placeholder.svg"}
                            alt={`${service.title} ${service.titleHighlight}`}
                            width={350}
                            height={350}
                            className="w-full h-[140px] sm:h-[180px] md:h-[220px] lg:h-[280px] xl:h-[350px] object-contain"
                          />
                        </div>

                        {/* Description */}
                        <p className="text-gray-300 text-[10px] font-semibold sm:text-xs md:text-xs lg:text-sm leading-relaxed mb-3 md:mb-4 lg:mb-5 line-clamp-3 min-h-[3em]">
                          {service.description}
                        </p>

                        {/* CTA */}
                        <div className="flex items-center transition-all duration-300 hover:translate-x-1">
                          <span className="text-[#F5EE30] text-[10px] sm:text-xs md:text-xs lg:text-sm font-bold uppercase mr-1.5 sm:mr-2 transition-colors duration-300">
                            Learn More
                          </span>
                          <Image
                            src="/airoplane.svg"
                            alt="Learn More"
                            width={16}
                            height={16}
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
      {/* Custom Styles for Service Slider */}
      <style jsx global>{`
        .service-swiper .swiper-slide {
          height: auto;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .service-swiper .swiper-pagination {
          position: static !important;
          margin-top: 20px;
        }
        .service-swiper .swiper-pagination-bullet {
          background: #cacaca;
          opacity: 1;
          width: 10px;
          height: 10px;
          margin: 0 6px;
        }
        .service-swiper .swiper-pagination-bullet-active {
          background: #F5EE30;
        }
      `}</style>
    </div>
  )
}

export default ServicesSection
