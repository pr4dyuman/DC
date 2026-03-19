"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield } from "lucide-react";

const inputClass =
    "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5EE30]/50 transition-colors";

export default function GetStartedSignupForm({
    formData,
    logoPreview,
    error,
    sendingOtp,
    submitting,
    otpSent,
    otp,
    otpTimer,
    showPassword,
    onFormFieldChange,
    onLogoChange,
    onTogglePassword,
    onOtpChange,
    onSendOtp,
    onSubmit,
}) {
    return (
        <section id="signup" className="py-20 sm:py-24 lg:py-32 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5EE30]/5 rounded-full blur-[180px] pointer-events-none" />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12 sm:mb-16">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-8 h-px bg-[#F5EE30]" />
                        <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                            Create Your Account
                        </span>
                        <div className="w-8 h-px bg-[#F5EE30]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase mb-4">
                        Start Your <span className="text-[#F5EE30]">Free Trial</span>
                    </h2>
                    <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
                        7 days of full Pro access. No credit card required.
                        Your dashboard will be ready instantly.
                    </p>
                </div>

                <form
                    onSubmit={onSendOtp}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-10"
                >
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Agency / Company Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.agencyName}
                                onChange={(event) => onFormFieldChange("agencyName", event.target.value)}
                                className={inputClass}
                                placeholder="Your Agency Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Your Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.ownerName}
                                onChange={(event) => onFormFieldChange("ownerName", event.target.value)}
                                className={inputClass}
                                placeholder="Admin / Owner Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(event) => onFormFieldChange("email", event.target.value)}
                                className={inputClass}
                                placeholder="you@company.com"
                            />
                            <p className="text-xs text-gray-600 mt-1.5">This will be your login email</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={(event) => onFormFieldChange("password", event.target.value)}
                                        className={`${inputClass} pr-12`}
                                        placeholder="Min 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={onTogglePassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs uppercase tracking-wide"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Confirm Password *
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    value={formData.confirmPassword}
                                    onChange={(event) => onFormFieldChange("confirmPassword", event.target.value)}
                                    className={inputClass}
                                    placeholder="Re-enter password"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(event) => onFormFieldChange("phone", event.target.value)}
                                className={inputClass}
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Gender *
                            </label>
                            <select
                                required
                                value={formData.gender}
                                onChange={(event) => onFormFieldChange("gender", event.target.value)}
                                className={`${inputClass} appearance-none cursor-pointer`}
                            >
                                <option value="Male" className="bg-black text-white">Male</option>
                                <option value="Female" className="bg-black text-white">Female</option>
                                <option value="Other" className="bg-black text-white">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                Agency Logo (Optional)
                            </label>
                            <div className="flex items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden bg-white/5 flex-shrink-0">
                                        <Image
                                            src={logoPreview}
                                            alt="Logo preview"
                                            fill
                                            sizes="64px"
                                            unoptimized
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0">
                                        <span className="text-gray-600 text-xs">Logo</span>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:border-[#F5EE30]/30 hover:text-white transition-all">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/gif,image/webp"
                                            onChange={onLogoChange}
                                            className="hidden"
                                        />
                                        {logoPreview ? "Change Logo" : "Upload Logo"}
                                    </label>
                                    <p className="text-xs text-gray-600 mt-1.5">PNG, JPG, GIF, or WebP - max 2MB</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 mb-6 flex items-start gap-3 bg-[#F5EE30]/[0.04] border border-[#F5EE30]/10 rounded-xl px-4 py-3.5">
                        <Shield className="w-5 h-5 text-[#F5EE30] mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-400">
                            <span className="text-[#F5EE30] font-bold">7-day free trial</span> with full Pro access including AI Assistant, unlimited projects, financial tools, and team management. No credit card required.
                        </div>
                    </div>

                    {otpSent ? (
                        <div className="space-y-4">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm text-center">
                                Verification code sent to <strong>{formData.email}</strong>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide text-center">
                                    Enter 6-Digit Verification Code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(event) => onOtpChange(event.target.value)}
                                    className="w-full bg-black/50 border-2 border-[#F5EE30]/30 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] font-bold placeholder-gray-600 focus:outline-none focus:border-[#F5EE30] transition-colors"
                                    placeholder="000000"
                                    autoFocus
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-gray-500">
                                        {otpTimer > 0
                                            ? `Expires in ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, "0")}`
                                            : "Code expired"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={onSendOtp}
                                        disabled={sendingOtp || otpTimer > 240}
                                        className="text-xs text-[#F5EE30] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {sendingOtp ? "Sending..." : "Resend Code"}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={submitting || otp.length !== 6}
                                className="w-full group inline-flex items-center justify-center gap-3 bg-[#F5EE30] text-black font-bold uppercase text-base px-10 py-4 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,238,48,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    "Creating Your Account..."
                                ) : (
                                    <>
                                        Verify and Create Account
                                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={sendingOtp}
                            className="w-full group inline-flex items-center justify-center gap-3 bg-[#F5EE30] text-black font-bold uppercase text-base px-10 py-4 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,238,48,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sendingOtp ? (
                                "Sending Verification Code..."
                            ) : (
                                <>
                                    Continue - Verify Email
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    )}

                    <p className="text-center text-sm text-gray-600 mt-4">
                        Already have an account?{" "}
                        <Link href="/login" className="text-[#F5EE30] hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </section>
    );
}
