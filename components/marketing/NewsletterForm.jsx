"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/actions/super-admin";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    const result = await subscribeNewsletter(email);
    if (result.success) {
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
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full bg-transparent border-b border-gray-500 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white font-glacial"
        suppressHydrationWarning
      />
      <button
        type="submit"
        disabled={status === "loading"}
        suppressHydrationWarning
        className="absolute right-0 bottom-2 text-[#D4E647] font-bold flex items-center gap-1 hover:text-[#e5f758] transition-colors uppercase text-sm tracking-wider disabled:opacity-50"
      >
        {status === "loading" ? "..." : "SEND"} <span className="text-xs">➤</span>
      </button>
      {message && (
        <p className={`text-xs mt-1 ${status === "success" ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
