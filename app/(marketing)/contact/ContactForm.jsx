"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MARKETING_EVENTS, trackMarketingEvent } from "@/lib/marketing-analytics";

const fieldClass =
  "w-full bg-transparent border-b border-white/30 pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none focus:border-[#F5EE30] focus-visible:ring-2 focus-visible:ring-[#F5EE30]/40 transition-colors duration-300";

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
        <div
          role={toast.isSuccess ? "status" : "alert"}
          aria-live={toast.isSuccess ? "polite" : "assertive"}
          className={`fixed top-5 right-5 z-[1000] px-6 py-4 rounded shadow-lg flex items-center transition-all transform duration-300 ${toast.isSuccess ? "bg-[#4CAF50]" : "bg-[#ff3333]"}`}
        >
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
          <div>
            <label htmlFor="contact-full-name" className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
              YOUR NAME
            </label>
            <input
              id="contact-full-name"
              type="text"
              placeholder="e.g., John Doe"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "contact-full-name-error" : undefined}
              className={fieldClass}
              {...register("fullName", {
                required: "Name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
                pattern: { value: /^[A-Za-z\s]+$/, message: "Name should only contain letters" },
              })}
            />
            {errors.fullName && (
              <p id="contact-full-name-error" role="alert" className="text-[#ff3333] text-xs mt-2">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-email" className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
              EMAIL
            </label>
            <input
              id="contact-email"
              type="email"
              placeholder="e.g., johndoe@mail.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              className={fieldClass}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email address" },
              })}
            />
            {errors.email && (
              <p id="contact-email-error" role="alert" className="text-[#ff3333] text-xs mt-2">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-phone" className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
              PHONE
            </label>
            <input
              id="contact-phone"
              type="tel"
              placeholder="e.g., +91-9876543210"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "contact-phone-error" : undefined}
              className={fieldClass}
              {...register("phone", {
                required: "Phone number is required",
                pattern: { value: /^[0-9+\-\s]+$/, message: "Invalid characters in phone number" },
                validate: (value) => {
                  const digits = (value || "").replace(/\D/g, "");
                  return (digits.length >= 10 && digits.length <= 13) || "Phone number must be 10-13 digits";
                },
              })}
            />
            {errors.phone && (
              <p id="contact-phone-error" role="alert" className="text-[#ff3333] text-xs mt-2">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-company-name" className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
              COMPANY NAME
            </label>
            <input
              id="contact-company-name"
              type="text"
              placeholder="e.g., Digital Corvids"
              aria-invalid={Boolean(errors.companyName)}
              aria-describedby={errors.companyName ? "contact-company-name-error" : undefined}
              className={fieldClass}
              {...register("companyName", {
                minLength: { value: 2, message: "Company name must be at least 2 characters" },
              })}
            />
            {errors.companyName && (
              <p id="contact-company-name-error" role="alert" className="text-[#ff3333] text-xs mt-2">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="contact-message" className="block text-[14px] md:text-[15px] font-bold uppercase mb-3 tracking-wide">
              MESSAGE
            </label>
            <div className="relative border-b border-white/30">
              <textarea
                id="contact-message"
                placeholder="e.g., I would like to discuss..."
                rows="4"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "contact-message-error" : undefined}
                className="w-full bg-transparent pb-3 text-white text-[15px] md:text-[16px] placeholder:text-white/30 outline-none transition-colors duration-300 resize-none pr-24 focus:border-transparent focus-visible:ring-2 focus-visible:ring-[#F5EE30]/40"
                {...register("message", {
                  required: "Message is required",
                  minLength: { value: 10, message: "Please enter a detailed message (at least 10 characters)" },
                })}
              />

              <button
                type="submit"
                aria-label="Send contact message"
                disabled={isSubmitting}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={`absolute right-0 bottom-0 w-24 h-24 md:w-32 md:h-32 rounded-full bg-white text-black flex items-center justify-center 
                  hover:bg-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] transition-colors duration-300 shadow-lg z-20
                  ${isSubmitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                  [--tx:0%] md:[--tx:40%] [--ty:50%]`}
                style={{
                  transform: `translate(calc(var(--tx) + ${buttonTransform.x}px), calc(var(--ty) + ${buttonTransform.y}px))`,
                }}
                title="Send Message"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin">
                    <span className="sr-only">Sending message</span>
                  </div>
                ) : (
                  <span className="font-bold text-lg md:text-xl tracking-wider">SEND</span>
                )}
              </button>
            </div>
            {errors.message && (
              <p id="contact-message-error" role="alert" className="text-[#ff3333] text-xs mt-2">
                {errors.message.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
