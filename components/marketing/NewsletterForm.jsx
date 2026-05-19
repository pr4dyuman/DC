"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/actions/super-admin";
import { MARKETING_EVENTS, trackMarketingEvent } from "@/lib/marketing-analytics";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const messageId = "newsletter-form-message";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    const result = await subscribeNewsletter(email);
    if (result.success) {
      trackMarketingEvent(MARKETING_EVENTS.newsletterSignup, {
        source: "footer",
      });
      setStatus("success");
      setMessage("Subscribed!");
      setEmail("");
      setTimeout(() => {
        setStatus("");
        setMessage("");
      }, 3000);
    } else {
      setStatus("error");
      setMessage(result.error || "Failed");
      setTimeout(() => {
        setStatus("");
        setMessage("");
      }, 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full mb-8">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address for newsletter
      </label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-describedby={message ? messageId : undefined}
        className="w-full bg-transparent border-b border-gray-500 py-2 pr-24 text-white placeholder-gray-400 focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/40 font-glacial"
        suppressHydrationWarning
      />
      <button
        type="submit"
        aria-label="Subscribe to the Digital Corvids newsletter"
        disabled={status === "loading"}
        suppressHydrationWarning
        className="absolute right-0 bottom-1 inline-flex min-h-8 min-w-16 items-center justify-end gap-1 text-[#D4E647] font-bold hover:text-[#e5f758] transition-colors uppercase text-sm tracking-wider disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4E647]"
      >
        {status === "loading" ? "..." : "SEND"} <span className="text-xs">{"\u2192"}</span>
      </button>
      {message && (
        <p
          id={messageId}
          role={status === "success" ? "status" : "alert"}
          className={`text-xs mt-1 ${status === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
