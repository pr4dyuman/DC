import { Instagram, Linkedin } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-black text-white w-full border-t-[5px] border-white/30 ">
      {/* Decorative Wing Image */}
      <div className="absolute pointer-events-none z-0 
        -bottom-20 right-0 w-full h-[120%] opacity-15
        lg:-top-32 lg:bottom-auto lg:right-0 lg:w-[45%] lg:h-[140%] lg:opacity-20">
        <Image
          src="/footer.svg"
          alt="decorative wing"
          fill
          className="object-contain object-bottom lg:object-right-top"
          priority={false}
        />
      </div>

      {/* Footer Content */}
      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          
          {/* Left: Branding & Socials */}
          <div className="flex flex-col max-w-md">
            <h2 className="text-5xl md:text-6xl font-suifak mb-4 text-white">Digital Corvids</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 font-glacial">
              A digital marketing agency specializing in SEO, social media, content, and ads—helping brands grow through smart, creative strategy.
            </p>
            
            {/* Divider Line */}
            <div className="w-full h-px bg-gray-700 mb-6"></div>

            {/* Social Icons */}
            <div className="flex gap-6">
              <a href="https://www.instagram.com/digitalcorvids?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors"><Instagram size={24} /></a>
              <a href="https://wa.me/918003177679" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/digital-corvids-681389306" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors"><Linkedin size={24} /></a>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <div className="flex gap-8 md:gap-12 mt-4 lg:mt-12 font-bold text-sm tracking-widest font-glacial">
            <a href="/about" className="hover:text-gray-300 transition-colors uppercase">ABOUT US</a>
            <a href="/contact" className="hover:text-gray-300 transition-colors uppercase">CONTACT US</a>
            <a href="/blog" className="hover:text-gray-300 transition-colors uppercase">BLOG</a>
          </div>

          {/* Right: Newsletter & Contact */}
          <div className="flex flex-col w-full max-w-sm mt-4 lg:mt-12">
            {/* Email Input Form */}
            <div className="relative w-full mb-8">
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full bg-transparent border-b border-gray-500 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white font-glacial"
                suppressHydrationWarning
              />
              <button suppressHydrationWarning className="absolute right-0 bottom-2 text-[#D4E647] font-bold flex items-center gap-1 hover:text-[#e5f758] transition-colors uppercase text-sm tracking-wider">
                SEND <span className="text-xs">➤</span>
              </button>
            </div>

            {/* Contact Info */}
            <div className="text-gray-400 text-sm font-glacial space-y-1">
              <a href="https://wa.me/918003177679" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors block">
                Mob No. - +91-8003177679
              </a>
              <p>Email - flytheraven@digitalcorvids.com</p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}