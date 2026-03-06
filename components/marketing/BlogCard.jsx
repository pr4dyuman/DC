import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const BlogCard = ({ title, category, excerpt, image, slug, date }) => {
  return (
    <Link href={`/blog/${slug}`} className="group block h-full w-full">
      <div className="relative h-[450px] w-full overflow-hidden rounded-2xl bg-gray-900 isolate">
        {/* Background Image with Zoom Effect */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />
        </div>

        {/* Floating Category Tag */}
        <div className="absolute top-6 left-6 z-10">
          <span className="bg-[#F5EE30] text-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-lg transform transition-transform duration-300 group-hover:-translate-y-1">
            {category}
          </span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-8 z-10 flex flex-col justify-end h-full">
          <div className="transform transition-all duration-500 translate-y-4 group-hover:translate-y-0">
            <div className="flex items-center justify-between mb-3 opacity-80">
              <span className="text-gray-300 text-xs uppercase tracking-widest font-glacial font-bold">
                {date}
              </span>
            </div>
            
            <h3 className="text-2xl md:text-3xl text-white font-etna mb-4 leading-tight group-hover:text-[#F5EE30] transition-colors duration-300">
              {title}
            </h3>
            
            <p className="text-gray-300 font-glacial text-sm md:text-base line-clamp-2 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform translate-y-4 group-hover:translate-y-0">
              {excerpt}
            </p>

            <div className="flex items-center text-[#F5EE30] font-bold uppercase tracking-wider text-sm border-b-2 border-transparent group-hover:border-[#F5EE30] w-fit pb-1 transition-all duration-300">
              Read Article
              <ArrowUpRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
