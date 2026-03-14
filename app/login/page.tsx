
"use client";

import { useState, useEffect, useRef } from "react";
import { authenticateUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Mail, KeyRound, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";

type ForgotStep = "email" | "otp" | "password" | "success";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authChecked, setAuthChecked] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forgot password state
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect logged-in users to dashboard
    useEffect(() => {
        const isLoggedIn = document.cookie.split(";").some((c) => c.trim().startsWith("logged_in="));
        if (isLoggedIn) {
            window.location.href = "/dashboard";
            return;
        }
        setAuthChecked(true);
    }, []);

    // Cooldown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await authenticateUser(email, password);
            if (result.success) {
                toast.success("Welcome back!");
                router.push(result.redirectTo || "/dashboard");
                router.refresh();
            } else {
                toast.error(result.error || "Login failed");
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const openForgotPassword = () => {
        setShowForgot(true);
        setForgotStep("email");
        setForgotEmail("");
        setForgotOtp(["", "", "", "", "", ""]);
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotError("");
        setCooldown(0);
    };

    const closeForgotPassword = () => {
        setShowForgot(false);
        setForgotError("");
    };

    // Step 1: Send OTP
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError("");

        try {
            const res = await fetch("/api/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();

            if (!res.ok) {
                setForgotError(data.error || "Failed to send code");
            } else {
                setForgotStep("otp");
                setCooldown(60);
                toast.success("Verification code sent to your email");
            }
        } catch {
            setForgotError("Something went wrong. Please try again.");
        } finally {
            setForgotLoading(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setForgotLoading(true);
        setForgotError("");

        try {
            const res = await fetch("/api/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();

            if (!res.ok) {
                setForgotError(data.error || "Failed to resend code");
            } else {
                setCooldown(60);
                setForgotOtp(["", "", "", "", "", ""]);
                toast.success("New code sent to your email");
            }
        } catch {
            setForgotError("Something went wrong. Please try again.");
        } finally {
            setForgotLoading(false);
        }
    };

    // Step 2: Verify OTP (proceed to password step)
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpValue = forgotOtp.join("");
        if (otpValue.length !== 6) {
            setForgotError("Please enter the complete 6-digit code");
            return;
        }
        setForgotError("");
        setForgotStep("password");
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError("");

        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError("Passwords do not match");
            return;
        }

        if (forgotNewPassword.length < 6) {
            setForgotError("Password must be at least 6 characters");
            return;
        }

        setForgotLoading(true);

        try {
            const res = await fetch("/api/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail,
                    otp: forgotOtp.join(""),
                    newPassword: forgotNewPassword,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                // If OTP error, go back to OTP step
                if (data.error?.includes("verification code") || data.error?.includes("attempts")) {
                    setForgotStep("otp");
                    setForgotOtp(["", "", "", "", "", ""]);
                }
                setForgotError(data.error || "Failed to reset password");
            } else {
                setForgotStep("success");
                toast.success("Password reset successfully!");
            }
        } catch {
            setForgotError("Something went wrong. Please try again.");
        } finally {
            setForgotLoading(false);
        }
    };

    // OTP input handler
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...forgotOtp];
        newOtp[index] = value.slice(-1);
        setForgotOtp(newOtp);
        setForgotError("");

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !forgotOtp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            const newOtp = pasted.split("");
            setForgotOtp(newOtp);
            otpRefs.current[5]?.focus();
        }
    };

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#F5EE30] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Step indicators for forgot password
    const stepConfig = {
        email: { icon: Mail, title: "Find Your Account", subtitle: "Enter the email address associated with your account" },
        otp: { icon: KeyRound, title: "Enter Verification Code", subtitle: `A 6-digit code has been sent to ${forgotEmail}` },
        password: { icon: Lock, title: "Create New Password", subtitle: "Enter your new password below" },
        success: { icon: CheckCircle2, title: "Password Reset!", subtitle: "Your password has been changed successfully" },
    };

    const currentStepConfig = stepConfig[forgotStep];
    const StepIcon = currentStepConfig.icon;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-glacial">
            <Navigation />

            <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
                <div className="w-full max-w-md">
                    {!showForgot ? (
                        <>
                            {/* ═══ LOGIN FORM ═══ */}
                            <div className="text-center mb-10">
                                <Link href="/" className="inline-block mb-6">
                                    <span className="text-[#F5EE30] text-6xl font-suifak tracking-tight">DC</span>
                                </Link>
                                <h1 className="text-3xl sm:text-4xl font-etna uppercase tracking-wider mb-2">
                                    Welcome Back
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    Sign in to access your agency portal
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="email">
                                        Email
                                    </label>
                                    <input
                                        className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300"
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300" htmlFor="password">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={openForgotPassword}
                                            className="text-xs text-[#F5EE30]/70 hover:text-[#F5EE30] transition-colors duration-300 uppercase tracking-wider"
                                            id="forgot-password-link"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loading ? "Signing In..." : "Sign In"}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-8">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-gray-500 text-xs uppercase tracking-widest">or</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Get Started */}
                            <Link
                                href="/get-started"
                                className="block w-full py-3 border-2 border-[#F5EE30] text-[#F5EE30] font-glacial-bold uppercase tracking-widest text-sm text-center hover:bg-[#F5EE30] hover:text-black transition-all duration-300"
                            >
                                Get Started — Free 7-Day Trial
                            </Link>

                            {/* Back to home */}
                            <div className="text-center mt-8">
                                <Link href="/" className="text-gray-500 text-sm hover:text-[#F5EE30] transition-colors">
                                    ← Back to Home
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ═══ FORGOT PASSWORD FLOW ═══ */}
                            <div className="text-center mb-8">
                                <Link href="/" className="inline-block mb-6">
                                    <span className="text-[#F5EE30] text-6xl font-suifak tracking-tight">DC</span>
                                </Link>

                                {/* Step Indicator */}
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    {(["email", "otp", "password"] as const).map((step, i) => (
                                        <div key={step} className="flex items-center gap-2">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                                                    forgotStep === step
                                                        ? "bg-[#F5EE30] text-black scale-110"
                                                        : forgotStep === "success" || (["email", "otp", "password"].indexOf(forgotStep) > i)
                                                        ? "bg-[#F5EE30]/20 text-[#F5EE30] border border-[#F5EE30]/40"
                                                        : "bg-white/5 text-gray-600 border border-white/10"
                                                }`}
                                            >
                                                {i + 1}
                                            </div>
                                            {i < 2 && (
                                                <div
                                                    className={`w-8 h-px transition-all duration-500 ${
                                                        (["email", "otp", "password"].indexOf(forgotStep) > i) || forgotStep === "success"
                                                            ? "bg-[#F5EE30]/40"
                                                            : "bg-white/10"
                                                    }`}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Step Icon & Title */}
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

                            {/* Error Message */}
                            {forgotError && (
                                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center rounded">
                                    {forgotError}
                                </div>
                            )}

                            {/* ─── Step: Email ─── */}
                            {forgotStep === "email" && (
                                <form onSubmit={handleSendOtp} className="space-y-6">
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
                                            onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
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
                                        onClick={closeForgotPassword}
                                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Sign In
                                    </button>
                                </form>
                            )}

                            {/* ─── Step: OTP ─── */}
                            {forgotStep === "otp" && (
                                <form onSubmit={handleVerifyOtp} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-4 text-center">
                                            Verification Code
                                        </label>
                                        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                                            {forgotOtp.map((digit, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => { otpRefs.current[i] = el; }}
                                                    className="w-11 h-14 sm:w-12 sm:h-16 bg-transparent border-2 border-white/20 text-center text-xl sm:text-2xl text-[#F5EE30] font-bold placeholder-gray-600 focus:border-[#F5EE30] focus:outline-none transition-all duration-300 focus:scale-105"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                    autoFocus={i === 0}
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
                                            onClick={handleResendOtp}
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
                                        onClick={closeForgotPassword}
                                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Sign In
                                    </button>
                                </form>
                            )}

                            {/* ─── Step: Password ─── */}
                            {forgotStep === "password" && (
                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="new-password">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                                                id="new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={forgotNewPassword}
                                                onChange={(e) => { setForgotNewPassword(e.target.value); setForgotError(""); }}
                                                required
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="confirm-password">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                                                id="confirm-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={forgotConfirmPassword}
                                                onChange={(e) => { setForgotConfirmPassword(e.target.value); setForgotError(""); }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password strength hints */}
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
                                        onClick={() => setForgotStep("otp")}
                                        className="w-full py-3 text-gray-400 hover:text-white text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Verification
                                    </button>
                                </form>
                            )}

                            {/* ─── Step: Success ─── */}
                            {forgotStep === "success" && (
                                <div className="space-y-6 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mx-auto">
                                        <CheckCircle2 className="h-8 w-8 text-green-400" />
                                    </div>
                                    <p className="text-gray-300 text-sm">
                                        You can now sign in with your new password.
                                    </p>
                                    <button
                                        onClick={closeForgotPassword}
                                        className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        Sign In Now
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
