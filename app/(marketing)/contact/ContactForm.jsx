"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MARKETING_EVENTS, trackMarketingEvent } from "@/lib/marketing-analytics";

export default function ContactForm() {
  const [toast, setToast] = useState({ show: false, message: "", isSuccess: true });
  const [buttonTransform, setButtonTransform] = useState({ x: 0, y: 0 });

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
  });

  const showToast = (message, isSuccess = true) => {
    setToast({ show: true, message, isSuccess });
    setTimeout(() => {
      setToast({ show: false, message: "", isSuccess: true });
    }, 5000);
  };

  const handleMouseMove = () => {
    const intensity = 4;
    const x = (Math.random() - 0.5) * intensity;
    const y = (Math.random() - 0.5) * intensity;
    setButtonTransform({ x, y });
  };

  const handleMouseLeave = () => {
    setButtonTransform({ x: 0, y: 0 });
  };

  const onSubmit = async (data) => {
    try {
      const response = await fetch("/api/contact-dc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      showToast(result.message || "Your message has been sent successfully!", true);
      trackMarketingEvent(MARKETING_EVENTS.contactFormSubmitted, {
        source: "contact_page",
        hasCompanyName: Boolean(data.companyName),
        hasPhone: Boolean(data.phone),
      });
      reset();
    } catch (error) {
      console.error("Submission error:", error);
      showToast(error.message || "Failed to send message. Please try again.", false);
    }
  };

  return (
    <>
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[1000] px-6 py-4 rounded shadow-lg flex items-center transition-all transform duration-300 ${toast.isSuccess ? "bg-[#4CAF50]" : "bg-[#ff3333]"}`}>
          {toast.message}
        </div>
      )}

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
                pattern: { value: /^[A-Za-z\s]+$/, message: "Name should only contain letters" },
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
                },
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
                minLength: { value: 2, message: "Company name must be at least 2 characters" },
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
                  transform: `translate(calc(var(--tx) + ${buttonTransform.x}px), calc(var(--ty) + ${buttonTransform.y}px))`,
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
    </>
  );
}
