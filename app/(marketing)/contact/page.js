"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

const ContactPage = () => {
  const [toast, setToast] = useState({ show: false, message: "", isSuccess: true })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      message: "",
      companyName: "",
      website: "",
    },
    mode: "onChange",
  })

  const showToast = (message, isSuccess = true) => {
    setToast({ show: true, message, isSuccess })
    setTimeout(() => {
      setToast({ show: false, message: "", isSuccess: true })
    }, 5000)
  }


  const [buttonTransform, setButtonTransform] = useState({ x: 0, y: 0 })

  const handleMouseMove = () => {
    const intensity = 4 // Adjust intensity as needed
    const x = (Math.random() - 0.5) * intensity
    const y = (Math.random() - 0.5) * intensity
    setButtonTransform({ x, y })
  }

  const handleMouseLeave = () => {
    setButtonTransform({ x: 0, y: 0 })
  }

  const onSubmit = async (data) => {
    try {
      const response = await fetch('/api/contact-dc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong')
      }

      showToast(result.message || "Your message has been sent successfully!", true)
      reset()
    } catch (error) {
      console.error('Submission error:', error)
      showToast(error.message || "Failed to send message. Please try again.", false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[1000] px-6 py-4 rounded shadow-lg flex items-center transition-all transform duration-300 ${toast.isSuccess ? "bg-[#4CAF50]" : "bg-[#ff3333]"}`}>
          {toast.message}
        </div>
      )}

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
          <form className="mt-16 md:mt-20" id="contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register("website")}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-10">
              {/* Your Name */}
              <div>
                <label className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
                  YOUR NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  className="w-full bg-transparent border-b border-white/30 pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none focus:border-[#F5EE30] transition-colors duration-300"
                  {...register("fullName", {
                    required: "Name is required",
                    minLength: { value: 2, message: "Name must be at least 2 characters" },
                    pattern: { value: /^[A-Za-z\s]+$/, message: "Name should only contain letters" }
                  })}
                />
                {errors.fullName && <p className="text-[#ff3333] text-xs mt-2">{errors.fullName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">EMAIL</label>
                <input
                  type="email"
                  placeholder="e.g., johndoe@mail.com"
                  className="w-full bg-transparent border-b border-white/30 pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none focus:border-[#F5EE30] transition-colors duration-300"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email address" },
                  })}
                />
                {errors.email && <p className="text-[#ff3333] text-xs mt-2">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">PHONE</label>
                <input
                  type="tel"
                  placeholder="e.g., +91-9876543210"
                  className="w-full bg-transparent border-b border-white/30 pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none focus:border-[#F5EE30] transition-colors duration-300"
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: { value: /^[0-9+\-\s]+$/, message: "Invalid characters in phone number" },
                    validate: (value) => {
                      const digits = (value || "").replace(/\D/g, "");
                      return (digits.length >= 10 && digits.length <= 13) || "Phone number must be 10-13 digits";
                    }
                  })}
                />
                {errors.phone && <p className="text-[#ff3333] text-xs mt-2">{errors.phone.message}</p>}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
                  COMPANY NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g., Digital Corvids"
                  className="w-full bg-transparent border-b border-white/30 pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none focus:border-[#F5EE30] transition-colors duration-300"
                  {...register("companyName", {
                    minLength: { value: 2, message: "Company name must be at least 2 characters" }
                  })}
                />
                {errors.companyName && <p className="text-[#ff3333] text-xs mt-2">{errors.companyName.message}</p>}
              </div>

              {/* Message - Full Width with Embedded Button */}
              <div className="md:col-span-2">
                <label className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
                  MESSAGE
                </label>
                <div className="relative border-b border-white/30">
                  <textarea
                    placeholder="e.g., I would like to discuss..."
                    rows="4"
                    className="w-full bg-transparent pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none transition-colors duration-300 resize-none pr-24 focus:border-transparent"
                    {...register("message", {
                      required: "Message is required",
                      minLength: { value: 10, message: "Please enter a detailed message (at least 10 characters)" },
                    })}
                  />

                  {/* Circular Send Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={`absolute right-0 bottom-0 w-24 h-24 md:w-32 md:h-32 rounded-full bg-white text-black flex items-center justify-center 
                      hover:bg-[#F5EE30] transition-colors duration-300 shadow-lg z-20
                      ${isSubmitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                      [--tx:0%] md:[--tx:40%] [--ty:50%]`}
                    style={{
                      transform: `translate(calc(var(--tx) + ${buttonTransform.x}px), calc(var(--ty) + ${buttonTransform.y}px))`
                    }}
                    title="Send Message"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="font-bold text-lg md:text-xl tracking-wider">SEND</span>
                    )}
                  </button>
                </div>
                {errors.message && <p className="text-[#ff3333] text-xs mt-2">{errors.message.message}</p>}
              </div>
            </div>
          </form>

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
  )
}

export default ContactPage
