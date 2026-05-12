"use client";

import type { FormEvent, KeyboardEvent, ClipboardEvent, MutableRefObject } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import type { ForgotStep } from "./login-shared";

type ForgotPasswordFlowProps = {
    forgotStep: ForgotStep;
    forgotEmail: string;
    forgotOtp: string[];
    forgotNewPassword: string;
    forgotConfirmPassword: string;
    forgotLoading: boolean;
    forgotError: string;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    cooldown: number;
    otpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
    onClose: () => void;
    onSendOtp: (event: FormEvent<HTMLFormElement>) => void;
    onResendOtp: () => void;
    onVerifyOtp: (event: FormEvent<HTMLFormElement>) => void;
    onResetPassword: (event: FormEvent<HTMLFormElement>) => void;
    onOtpChange: (index: number, value: string) => void;
    onOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
    onOtpPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
    onForgotEmailChange: (value: string) => void;
    onForgotNewPasswordChange: (value: string) => void;
    onForgotConfirmPasswordChange: (value: string) => void;
    onToggleNewPassword: () => void;
    onToggleConfirmPassword: () => void;
    onBackToOtp: () => void;
    onClearError: () => void;
};

const stepOrder: ForgotStep[] = ["email", "otp", "password"];

export default function ForgotPasswordFlow({
    forgotStep,
    forgotEmail,
    forgotOtp,
    forgotNewPassword,
    forgotConfirmPassword,
    forgotLoading,
    forgotError,
    showNewPassword,
    showConfirmPassword,
    cooldown,
    otpRefs,
    onClose,
    onSendOtp,
    onResendOtp,
    onVerifyOtp,
    onResetPassword,
    onOtpChange,
    onOtpKeyDown,
    onOtpPaste,
    onForgotEmailChange,
    onForgotNewPasswordChange,
    onForgotConfirmPasswordChange,
    onToggleNewPassword,
    onToggleConfirmPassword,
    onBackToOtp,
    onClearError,
}: ForgotPasswordFlowProps) {
    const stepConfig = {
        email: {
            icon: Mail,
            title: "Find Your Account",
            subtitle: "Enter the email address associated with your account",
        },
        otp: {
            icon: KeyRound,
            title: "Enter Verification Code",
            subtitle: `A 6-digit code has been sent to ${forgotEmail}`,
        },
        password: {
            icon: Lock,
            title: "Create New Password",
            subtitle: "Enter your new password below",
        },
        success: {
            icon: CheckCircle2,
            title: "Password Reset!",
            subtitle: "Your password has been changed successfully",
        },
    } as const;

    const currentStepConfig = stepConfig[forgotStep];
    const StepIcon = currentStepConfig.icon;

    return (
        <>
            <div className="text-center mb-8">
                <Link href="/" className="inline-block mb-6">
                    <span className="text-[#F5EE30] text-6xl font-suifak tracking-tight">DC</span>
                </Link>

                <div className="flex items-center justify-center gap-2 mb-6">
                    {stepOrder.map((step, index) => (
                        <div key={step} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                                    forgotStep === step
                                        ? "bg-[#F5EE30] text-black scale-110"
                                        : forgotStep === "success" || stepOrder.indexOf(forgotStep) > index
                                            ? "bg-[#F5EE30]/20 text-[#F5EE30] border border-[#F5EE30]/40"
                                            : "bg-white/5 text-gray-600 border border-white/10"
                                }`}
                            >
                                {index + 1}
                            </div>
                            {index < stepOrder.length - 1 && (
                                <div
                                    className={`w-8 h-px transition-all duration-500 ${
                                        stepOrder.indexOf(forgotStep) > index || forgotStep === "success"
                                            ? "bg-[#F5EE30]/40"
                                            : "bg-white/10"
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F5EE30]/10 border border-[#F5EE30]/20 mb-4">
                    <StepIcon className={`h-7 w-7 ${forgotStep === "success" ? "text-green-400" : "text-[#F5EE30]"}`} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-etna uppercase tracking-wider mb-2">
                    {currentStepConfig.title}
                </h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    {currentStepConfig.subtitle}
                </p>
            </div>

            {forgotError && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center rounded">
                    {forgotError}
                </div>
            )}

            {forgotStep === "email" && (
                <form onSubmit={onSendOtp} className="space-y-6">
                    <div>
                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="forgot-email">
                            Email Address
                        </label>
                        <input
                            className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300"
                            id="forgot-email"
                            type="email"
                            placeholder="name@example.com"
                            value={forgotEmail}
                            onChange={(event) => {
                                onForgotEmailChange(event.target.value);
                                onClearError();
                            }}
                            required
                            autoFocus
                        />
                    </div>

                    <button
                        className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        type="submit"
                        disabled={forgotLoading || !forgotEmail}
                    >
                        {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {forgotLoading ? "Sending..." : "Send Verification Code"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </button>
                </form>
            )}

            {forgotStep === "otp" && (
                <form onSubmit={onVerifyOtp} className="space-y-6">
                    <div>
                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-4 text-center">
                            Verification Code
                        </label>
                        <div className="flex justify-center gap-2 sm:gap-3" onPaste={onOtpPaste}>
                            {forgotOtp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => {
                                        otpRefs.current[index] = element;
                                    }}
                                    className="w-11 h-14 sm:w-12 sm:h-16 bg-transparent border-2 border-white/20 text-center text-xl sm:text-2xl text-[#F5EE30] font-bold placeholder-gray-600 focus:border-[#F5EE30] focus:outline-none transition-all duration-300 focus:scale-105"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(event) => onOtpChange(index, event.target.value)}
                                    onKeyDown={(event) => onOtpKeyDown(index, event)}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        type="submit"
                        disabled={forgotLoading || forgotOtp.join("").length !== 6}
                    >
                        {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Verify Code
                    </button>

                    <div className="text-center">
                        <p className="text-gray-500 text-xs mb-2">Didn&apos;t receive the code?</p>
                        <button
                            type="button"
                            onClick={onResendOtp}
                            disabled={cooldown > 0 || forgotLoading}
                            className={`text-sm uppercase tracking-wider transition-colors ${
                                cooldown > 0
                                    ? "text-gray-600 cursor-not-allowed"
                                    : "text-[#F5EE30] hover:text-white"
                            }`}
                        >
                            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </button>
                </form>
            )}

            {forgotStep === "password" && (
                <form onSubmit={onResetPassword} className="space-y-6">
                    <div>
                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="forgot-new-password">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                                id="forgot-new-password"
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={forgotNewPassword}
                                onChange={(event) => {
                                    onForgotNewPasswordChange(event.target.value);
                                    onClearError();
                                }}
                                required
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={onToggleNewPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="forgot-confirm-password">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                                id="forgot-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={forgotConfirmPassword}
                                onChange={(event) => {
                                    onForgotConfirmPasswordChange(event.target.value);
                                    onClearError();
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={onToggleConfirmPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                        <p className={forgotNewPassword.length >= 8 ? "text-green-400" : ""}>• At least 8 characters</p>
                        <p className={/[A-Z]/.test(forgotNewPassword) ? "text-green-400" : ""}>• One uppercase letter</p>
                        <p className={/[0-9]/.test(forgotNewPassword) ? "text-green-400" : ""}>• One number</p>
                        <p className={/[^A-Za-z0-9]/.test(forgotNewPassword) ? "text-green-400" : ""}>• One special character</p>
                    </div>

                    <button
                        className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        type="submit"
                        disabled={forgotLoading || !forgotNewPassword || !forgotConfirmPassword}
                    >
                        {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {forgotLoading ? "Resetting..." : "Reset Password"}
                    </button>

                    <button
                        type="button"
                        onClick={onBackToOtp}
                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Verification
                    </button>
                </form>
            )}

            {forgotStep === "success" && (
                <div className="space-y-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-gray-300 text-sm">
                        You can now sign in with your new password.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        Sign In Now
                    </button>
                </div>
            )}
        </>
    );
}
