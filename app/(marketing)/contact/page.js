import Image from "next/image";
import Link from "next/link";
import ContactForm from "./ContactForm";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative px-6 md:px-12 lg:px-16 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold uppercase leading-tight mb-2">
              CONTACT US
            </h1>
            <div className="flex items-center justify-center gap-2 text-[14px] md:text-[16px]">
              <Link href="/" className="text-white hover:text-[#F5EE30] transition-colors font-medium">
                HOME
              </Link>
              <span className="text-white">|</span>
              <span className="text-[#F5EE30] font-medium">CONTACT US</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2  lg:gap-16 items-start lg:items-end ">
            {/* Left Side - Text Content */}
            <div className="space-y-6 lg:h-full lg:flex lg:flex-col lg:justify-end">
              <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-bold leading-tight uppercase">
                ONE STOP SOLUTION FOR
                <br />
                <span className="text-[#F5EE30]">ALL YOUR DIGITAL NEEDS</span>
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <span className="text-[#F5EE30] text-[20px] mt-1">●</span>
                  <div>
                    <h3 className="text-[16px] md:text-[18px] font-bold uppercase mb-2">
                      LET&apos;S BUILD SOMETHING GREAT TOGETHER
                    </h3>
                    <p className="text-[13px] md:text-[14px] leading-relaxed text-gray-300">
                      Have a project in mind or just want to explore the possibilities? We&apos;d love to hear from you.
                      Reach out to Digital Corvids and let&apos;s start creating digital strategies that move your brand
                      forward.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Illustration */}
            <div className="flex justify-start lg:justify-end">
              <div className="relative w-full max-w-[500px] lg:max-w-[400px] lg:-translate-y-2">
                <Image
                  src="/contact-us1.png"
                  alt="Growth Chart Illustration"
                  width={500}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <ContactForm />

          <div className="grid lg:grid-cols-2 lg:gap-16 items-center mt-20">
            {/* Left Side - Illustration */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-full max-w-[500px] lg:max-w-[450px]">
                <Image
                  src="/contact2.svg"
                  alt="Assistance Illustration"
                  width={500}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Right Side - Text Content */}
            <div className="space-y-4 text-right lg:text-right flex flex-col items-end">
              <h2 className="text-[32px] md:text-[42px] lg:text-[50px] font-bold leading-tight uppercase">
                WE ARE HAPPY TO
                <br />
                <span className="text-[#F5EE30]">ASSIST YOU</span>
              </h2>
              <p className="text-[13px] md:text-[14px] leading-relaxed text-gray-300 max-w-md">
                have a question or need a tailored solution? our team at digital corvids is just a message away.
                fill out the form or connect with us directly, and we&apos;ll make sure your query gets the attention it deserves.
                <br />
                <span className="text-xs opacity-70">(average response time: within 24 hours)</span>
              </p>
            </div>
          </div>
          {/* Location / Contact / Social Block */}
          <div className="space-y-6 mt-10">
            {/* Location */}
            <div className="border-t border-white/20 pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="text-[16px] md:text-[18px] font-bold uppercase tracking-wide">LOCATION</h3>
                <p className="text-[13px] md:text-[14px] text-gray-300 md:text-right">
                  Digital Corvids, Malviya Nagar, Jaipur, Rajasthan
                </p>
              </div>
            </div>
            {/* Contact */}
            <div className="border-t border-white/20 pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="text-[16px] md:text-[18px] font-bold uppercase tracking-wide">CONTACT</h3>
                <div className="text-[13px] md:text-[14px] text-gray-300 md:text-right space-y-1">
                  <p>flytheraven@digitalcorvids.com</p>
                  <p>+91-8003177679</p>
                </div>
              </div>
            </div>
            {/* Social */}
            <div className="border-t border-white/20 pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="text-[16px] md:text-[18px] font-bold uppercase tracking-wide">SOCIAL</h3>
                <div className="flex gap-6 text-[13px] md:text-[14px] font-medium">
                  <Link href="https://www.facebook.com/profile.php?id=61571171168177" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5EE30] transition-colors uppercase">
                    Facebook
                  </Link>
                  <Link href="https://www.instagram.com/digitalcorvids/" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5EE30] transition-colors uppercase">
                    Instagram
                  </Link>
                  <Link href="https://www.linkedin.com/company/digital-corvids/" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5EE30] transition-colors uppercase">
                    LinkedIn
                  </Link>
                  <Link href="https://wa.me/918003177679" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5EE30] transition-colors uppercase">
                    WhatsApp
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
