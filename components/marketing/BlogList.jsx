"use client";
import React, { useState } from "react";
import Navigation from "./Navigation";
import Footer from "./footer";
import BlogCard from "./BlogCard";


const BlogList = ({ posts, categories }) => {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filteredPosts = activeCategory === "ALL" 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  return (
    <div className="bg-black min-h-screen flex flex-col font-glacial">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 md:px-10 lg:px-16 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5EE30] opacity-5 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-white text-[clamp(3.5rem,9vw,8rem)] font-etna leading-[0.85] mb-8 tracking-tight">
            LATEST <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5EE30] to-white">INSIGHTS</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-glacial leading-relaxed mb-12">
            Explore our thoughts on digital innovation, design strategy, and the future of technology.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-4 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold tracking-wider transition-all duration-300 border ${
                  activeCategory === cat
                    ? "bg-[#F5EE30] text-black border-[#F5EE30]"
                    : "bg-transparent text-gray-400 border-gray-800 hover:border-[#F5EE30] hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <div key={post._id || post.id} className="h-full">
                <BlogCard {...post} />
              </div>
            ))}
          </div>
          
          {filteredPosts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-xl">No posts found.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogList;
