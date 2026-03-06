import Image from "next/image";


import Link from "next/link";

export default function WebDevelopment() {
  return (
    <div className="min-h-screen bg-black text-white">
      
      <div className="max-w-7xl mx-auto px-6 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        <div className="text-center mb-16">
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
            <span className="text-[#3E3E3E] font-glacial-bold">WEB DEVELOPMENT</span>
            </p>
          </div>

        {/* First Section - Web Development */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-20 lg:mb-32">
          {/* Left - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pr-12">
            <div className="relative">
              <Image
                src="/web3.svg"
                alt="Web Development Illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Right - Text Content */}
          <div className="w-full lg:w-1/2 lg:pl-12">
            <p className="text-white text-lg font-glacial-bold mb-4 uppercase tracking-wide">
              BUILDING DIGITAL EXPERIENCES THAT DRIVE RESULTS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#F5EE30]">
              WEB DEVELOPMENT
            </h2>
            <h4 className="text-xl font-glacial-bold mb-4 text-white">OUR MISSION</h4>
            <p className="text-white mb-6 leading-relaxed text-lg">
              To design high-performance websites tailored to enhance user
              interaction, functionality, and brand experience that deliver
              measurable business growth.
            </p>
            <p className="text-xl font-glacial-bold mb-4 text-white">OUR VISION</p>
            <p className="text-white leading-relaxed text-lg">
              We envision the web as your best business card—seamlessly blending
              modern technologies, creative strategies, and meaningful digital
              experiences that are both powerful and user-focused.
            </p>
          </div>
        </div>

        {/* Second Section - UX Design & Research */}
        <div className="flex flex-col lg:flex-row-reverse items-center justify-between">
          {/* Right - Image */}
          <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 lg:pl-12">
            <div className="relative">
              <Image
                src="/web6.svg"
                alt="UX Research Illustration"
                width={500}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Left - Text Content */}
          <div className="w-full lg:w-1/2 lg:pr-12">
            <h3 className="text-white text-lg font-glacial-bold mb-4 uppercase tracking-wide">
              USER-FOCUSED DESIGN THAT CONNECTS
            </h3>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#F5EE30]">
              UX DESIGN &<br />RESEARCH
            </h2>
            <p className="text-white mb-6 leading-relaxed text-lg">
              Our Research & Product Development team creates intuitive user experiences through comprehensive analysis and testing.
            </p>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                User Research & Needs Development
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Information Architecture
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Interactive Wireframes
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Usability Testing
              </li>
              <li className="flex items-start">
                <span className="text-[#F5EE30] mr-3">•</span>
                Accessibility Compliance (WCAG)
              </li>
            </ul>
          </div>
        </div>
        
        {/* Responsive Development Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative">
              <Image
                src="/web1.svg"
                alt="Responsive development illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          {/* Right - Text */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest font-glacial-bold text-sm text-white">
                Pixel-perfect websites that adapt seamlessly to any device
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">RESPONSIVE</span><br />
              <span className="text-[#3E3E3E]">DEVELOPMENT</span>
            </h2>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Custom Frontend Development (HTML, CSS3, JavaScript)</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Cross-Platform App Development</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Design Systems & Design Consistency</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>CMS Integration (WordPress, Shopify, etc.)</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Ecommerce Solutions</li>
            </ul>
          </div>
        </div>

        {/* Technical SEO Optimization Section */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image - Top on mobile, Right on desktop */}
          <div className="w-full flex justify-center order-1 lg:order-2">
            <div className="relative">
              <Image
                src="/web4.svg"
                alt="Technical SEO illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          
          {/* Text - Bottom on mobile, Left on desktop */}
          <div className="w-full order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm text-white font-glacial-bold">
                Building search engine friendly websites from the ground up
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">TECHNICAL</span> <span className="text-[#3E3E3E]">SEO</span><br />
              <span className="text-[#3E3E3E]">OPTIMIZATION</span>
            </h2>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Core Web Vitals Optimization</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Schema Markup Implementation</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Website Architecture</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Mobile & Desktop Performance</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Indexing & Crawlability</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Page Speed Enhancements</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="w-full flex justify-center">
            <div className="relative">
               <Image
                src="/web5.svg"
                alt="Performance optimization illustration"
                width={400}
                height={400}
                className="max-w-full h-auto"
              />
            </div>
          </div>
          {/* Right - Text */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-[#F5EE30] rounded-full"></span>
              <span className="uppercase tracking-widest text-sm text-white font-glacial-bold">
                Optimized performance for lightning-fast user experiences
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              <span className="text-white">PERFORMANCE</span><br />
              <span className="text-[#3E3E3E]">OPTIMIZATION</span>
            </h2>
            <ul className="space-y-3 text-white text-lg">
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Code Optimization & Minification</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Image Compression & Lazy Loading</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Caching Strategy Implementation</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>CDN Integration & Setup</li>
              <li className="flex items-start"><span className="text-[#F5EE30] mr-3">•</span>Database Query Optimization</li>
            </ul>
          </div>
        </div>
      </div>
        <div className="bg-black text-white py-16">
      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold text-center text-black py-4" style={{ backgroundColor: "#F5EE30" }}>
        WHY CHOOSE US
      </h2>

      {/* Features Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 text-center py-10">
        <div>
          <h3 className="text-lg md:text-xl font-bold">STRATEGIC APPROACH</h3>
          <p className="text-sm md:text-base mt-2 text-gray-300 max-w-[200px] mx-auto leading-relaxed">
            We don’t just build websites; we create digital solutions aligned with your business objectives.
          </p>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold">EXPERT TEAM</h3>
          <p className="text-sm md:text-base mt-2 text-gray-300 max-w-[200px] mx-auto leading-relaxed">
            Our developers, designers, and strategists bring years of experience across diverse industries.
          </p>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold">CUSTOM SOLUTIONS</h3>
          <p className="text-sm md:text-base mt-2 text-gray-300 max-w-[200px] mx-auto leading-relaxed">
            No templates or cookie-cutter designs—just tailored websites built specifically for your needs.
          </p>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold">FUTURE-PROOF TECHNOLOGY</h3>
          <p className="text-sm md:text-base mt-2 text-gray-300 max-w-[200px] mx-auto leading-relaxed">
            We build with scalability in mind, using the latest technologies that grow with your business.
          </p>
        </div>
      </div>

      {/* Transform Section */}
      <div className="flex flex-col md:flex-row items-center justify-between mt-12 gap-6 px-6 md:px-16">
        <div className="text-center md:text-left max-w-2xl">
          <h3 className="text-2xl md:text-3xl font-extrabold leading-snug">
            READY TO TRANSFORM <br />
            <span className="text-[#3E3E3E]">YOUR DIGITAL PRESENCE?</span>
          </h3>
          <p className="text-sm md:text-base mt-3 text-[#3E3E3E]">
            Let’s discuss how our web development expertise can help you achieve your business goals with a website that stands out from the competition.
          </p>
        </div>

        {/* Circle Button */}
        <div className="flex justify-center md:justify-end px-6 md:px-16">
          <a href="/get-started" class="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all">GET STARTED</a>
        </div>
      </div>
    </div>
      
      {/* Footer Section */}
     
    </div>
  );
}


