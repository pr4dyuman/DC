"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { authenticateUser } from "@/lib/auth";
import GetStartedLoadingScreen from "./_components/GetStartedLoadingScreen";
import GetStartedHero from "./_components/GetStartedHero";
import GetStartedFeaturesSection from "./_components/GetStartedFeaturesSection";
import GetStartedAISpotlight from "./_components/GetStartedAISpotlight";
import GetStartedStepsSection from "./_components/GetStartedStepsSection";
import GetStartedSignupForm from "./_components/GetStartedSignupForm";

function GetStartedPageContent() {
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        agencyName: "",
        ownerName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        gender: "Male",
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpTimer, setOtpTimer] = useState(0);
    const [authChecked, setAuthChecked] = useState(false);
    const [authView, setAuthView] = useState("signup");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const directAuthMode = searchParams.get("mode") === "auth" || searchParams.get("source") === "ai-blogger";
    const isAIBloggerFlow = searchParams.get("source") === "ai-blogger";

    const clearLoggedInCookie = () => {
        document.cookie = "logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            try {
                const currentUser = await getCurrentUser();
                if (cancelled) return;

                if (currentUser) {
                    window.location.href = "/dashboard";
                    return;
                }

                clearLoggedInCookie();
            } catch {
                if (!cancelled) {
                    clearLoggedInCookie();
                }
            } finally {
                if (!cancelled) {
                    setAuthChecked(true);
                }
            }
        };

        void checkSession();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (otpTimer <= 0) return;
        const interval = setInterval(() => {
            setOtpTimer((timeLeft) => {
                if (timeLeft <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return timeLeft - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleFormFieldChange = (field, value) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    const handleAuthViewChange = (nextView) => {
        setAuthView(nextView);
        setError("");
        setLoginError("");
    };

    const handleLogoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError("Logo must be under 2MB");
            return;
        }

        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setError("Unsupported format. Please use PNG, JPG, GIF, or WebP.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            setLogo(loadEvent.target?.result || null);
            setLogoPreview(loadEvent.target?.result || null);
            setError("");
        };
        reader.readAsDataURL(file);
    };

    const handleSendOtp = async (event) => {
        event.preventDefault();
        setError("");

        if (!formData.agencyName || !formData.ownerName || !formData.email || !formData.password) {
            setError("Please fill in all required fields");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
            setError("Password must contain at least 1 letter and 1 number");
            return;
        }

        setSendingOtp(true);
        try {
            const response = await fetch("/api/signup/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email }),
            });
            const data = await response.json();
            if (data.success) {
                setOtpSent(true);
                setOtpTimer(300);
                setOtp("");
            } else {
                setError(data.error || "Failed to send verification code");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!otp || otp.length !== 6) {
            setError("Please enter the 6-digit verification code");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agencyName: formData.agencyName,
                    ownerName: formData.ownerName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    gender: formData.gender,
                    otp,
                    logo: logo || "",
                }),
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = data.redirectTo || "/dashboard";
            } else {
                setError(data.error || "Something went wrong");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoginError("");
        setLoginLoading(true);

        try {
            const result = await authenticateUser(loginEmail, loginPassword);
            if (result.success) {
                window.location.href = result.redirectTo || "/dashboard";
            } else {
                setLoginError(result.error || "Login failed");
            }
        } catch {
            setLoginError("Something went wrong. Please try again.");
        } finally {
            setLoginLoading(false);
        }
    };

    if (!authChecked) {
        return <GetStartedLoadingScreen />;
    }

    if (directAuthMode) {
        return (
            <section className="relative overflow-hidden py-12 text-white font-glacial sm:py-16 lg:py-20">
                <div className="pointer-events-none absolute left-1/2 top-20 h-[90vw] max-h-[420px] w-[90vw] max-w-[420px] -translate-x-1/2 rounded-full bg-[#F5EE30]/10 blur-[140px]" />

                <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-10 text-center">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F5EE30]/30 bg-[#F5EE30]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F5EE30] sm:text-sm">
                            <Sparkles className="h-4 w-4" />
                            {isAIBloggerFlow ? "AI Blogger Access" : "Direct Signup Access"}
                        </div>

                        <h1 className="text-4xl font-bold uppercase leading-tight sm:text-5xl lg:text-6xl">
                            Create Your Account
                            <br />
                            <span className="text-[#F5EE30]">Or Sign In Directly</span>
                        </h1>

                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
                            {isAIBloggerFlow
                                ? "Start with AI Blogger right away. New accounts are verified using a 6-digit email OTP delivered through Brevo."
                                : "Start your DC account right away. New accounts are verified using a 6-digit email OTP delivered through Brevo."}
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => handleAuthViewChange("signup")}
                                className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase transition-all duration-300 sm:px-8 sm:py-4 sm:text-base ${authView === "signup"
                                        ? "bg-[#F5EE30] text-black hover:bg-yellow-300 hover:shadow-[0_0_30px_rgba(245,238,48,0.3)]"
                                        : "border border-white/30 text-white hover:border-[#F5EE30] hover:text-[#F5EE30]"
                                    }`}
                            >
                                Create Account
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAuthViewChange("login")}
                                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase transition-all duration-300 sm:px-8 sm:py-4 sm:text-base ${authView === "login"
                                        ? "bg-[#F5EE30] text-black hover:bg-yellow-300 hover:shadow-[0_0_30px_rgba(245,238,48,0.3)]"
                                        : "border border-white/30 text-white hover:border-[#F5EE30] hover:text-[#F5EE30]"
                                    }`}
                            >
                                Sign In
                            </button>
                        </div>
                    </div>

                    {authView === "signup" ? (
                        <GetStartedSignupForm
                            formData={formData}
                            logoPreview={logoPreview}
                            error={error}
                            sendingOtp={sendingOtp}
                            submitting={submitting}
                            otpSent={otpSent}
                            otp={otp}
                            otpTimer={otpTimer}
                            showPassword={showPassword}
                            onFormFieldChange={handleFormFieldChange}
                            onLogoChange={handleLogoChange}
                            onTogglePassword={() => setShowPassword((value) => !value)}
                            onOtpChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                            onSendOtp={handleSendOtp}
                            onSubmit={handleSubmit}
                            onOpenSignIn={() => handleAuthViewChange("login")}
                        />
                    ) : (
                        <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-10">
                            {loginError && (
                                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    {loginError}
                                </div>
                            )}

                            <div className="mb-8 text-center">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-300">
                                    Returning User
                                </div>
                                <h2 className="text-3xl font-bold uppercase sm:text-4xl">
                                    Sign In To <span className="text-[#F5EE30]">Continue</span>
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-gray-400 sm:text-base">
                                    Access your DC account and continue where you left off.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-glacial-bold uppercase tracking-wide text-gray-400">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(event) => setLoginEmail(event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder-gray-600 transition-colors focus:border-[#F5EE30]/50 focus:outline-none"
                                        placeholder="you@company.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="block text-sm font-glacial-bold uppercase tracking-wide text-gray-400">
                                            Password
                                        </label>
                                        <Link
                                            href="/login"
                                            className="text-xs uppercase tracking-wide text-[#F5EE30] hover:underline"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showLoginPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={(event) => setLoginPassword(event.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 pr-12 text-white placeholder-gray-600 transition-colors focus:border-[#F5EE30]/50 focus:outline-none"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                                        >
                                            {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loginLoading}
                                    className="w-full rounded-full bg-[#F5EE30] px-10 py-4 text-base font-bold uppercase text-black transition-all duration-300 hover:bg-yellow-300 hover:shadow-[0_0_40px_rgba(245,238,48,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loginLoading ? "Signing In..." : "Sign In"}
                                </button>
                            </form>

                            <div className="mt-6 text-center text-sm text-gray-600">
                                Need a new account?{" "}
                                <button
                                    type="button"
                                    onClick={() => handleAuthViewChange("signup")}
                                    className="text-[#F5EE30] hover:underline"
                                >
                                    Create one here
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    return (
        <div className="bg-black text-white font-glacial">
            <GetStartedHero />
            <GetStartedFeaturesSection />
            <GetStartedAISpotlight />
            <GetStartedStepsSection />
            <GetStartedSignupForm
                formData={formData}
                logoPreview={logoPreview}
                error={error}
                sendingOtp={sendingOtp}
                submitting={submitting}
                otpSent={otpSent}
                otp={otp}
                otpTimer={otpTimer}
                showPassword={showPassword}
                onFormFieldChange={handleFormFieldChange}
                onLogoChange={handleLogoChange}
                onTogglePassword={() => setShowPassword((value) => !value)}
                onOtpChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                onSendOtp={handleSendOtp}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

export default function GetStartedPage() {
    return (
        <Suspense fallback={<GetStartedLoadingScreen />}>
            <GetStartedPageContent />
        </Suspense>
    );
}
