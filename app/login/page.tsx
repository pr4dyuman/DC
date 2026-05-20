"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authenticateUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/actions";
import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";
import LoginLoadingScreen from "./_components/LoginLoadingScreen";
import LoginPanel from "./_components/LoginPanel";
import ForgotPasswordFlow from "./_components/ForgotPasswordFlow";
import type { ForgotStep } from "./_components/login-shared";

function hasLoggedInCookie() {
    return document.cookie
        .split(";")
        .some((cookie) => cookie.trim().startsWith("logged_in=1"));
}

function clearLoggedInCookie() {
    document.cookie = "logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authChecked, setAuthChecked] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [showForgot, setShowForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [resendOtpLoading, setResendOtpLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            if (!hasLoggedInCookie()) {
                clearLoggedInCookie();
                setAuthChecked(true);
                return;
            }

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
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
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
        setResendOtpLoading(false);
        setForgotError("");
        setCooldown(0);
    };

    const closeForgotPassword = () => {
        setShowForgot(false);
        setForgotError("");
    };

    const handleSendOtp = async (event: React.FormEvent) => {
        event.preventDefault();
        setForgotLoading(true);
        setForgotError("");

        try {
            const response = await fetch("/api/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await response.json();

            if (!response.ok) {
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

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setResendOtpLoading(true);
        setForgotError("");

        try {
            const response = await fetch("/api/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await response.json();

            if (!response.ok) {
                setForgotError(data.error || "Failed to resend code");
            } else {
                setCooldown(60);
                setForgotOtp(["", "", "", "", "", ""]);
                toast.success("New code sent to your email");
            }
        } catch {
            setForgotError("Something went wrong. Please try again.");
        } finally {
            setResendOtpLoading(false);
        }
    };

    const handleVerifyOtp = async (event: React.FormEvent) => {
        event.preventDefault();
        const otpValue = forgotOtp.join("");
        if (otpValue.length !== 6) {
            setForgotError("Please enter the complete 6-digit code");
            return;
        }
        setForgotError("");
        setForgotStep("password");
    };

    const handleResetPassword = async (event: React.FormEvent) => {
        event.preventDefault();
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
            const response = await fetch("/api/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: forgotEmail,
                    otp: forgotOtp.join(""),
                    newPassword: forgotNewPassword,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
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

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const nextOtp = [...forgotOtp];
        nextOtp[index] = value.slice(-1);
        setForgotOtp(nextOtp);
        setForgotError("");

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Backspace" && !forgotOtp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            const nextOtp = pasted.split("");
            setForgotOtp(nextOtp);
            setForgotError("");
            otpRefs.current[5]?.focus();
        }
    };

    if (!authChecked) {
        return <LoginLoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-glacial">
            <Navigation />

            <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
                <div className="w-full max-w-md">
                    {!showForgot ? (
                        <LoginPanel
                            email={email}
                            password={password}
                            loading={loading}
                            showPassword={showPassword}
                            onEmailChange={setEmail}
                            onPasswordChange={setPassword}
                            onTogglePassword={() => setShowPassword((value) => !value)}
                            onForgotPassword={openForgotPassword}
                            onSubmit={handleLogin}
                        />
                    ) : (
                        <ForgotPasswordFlow
                            forgotStep={forgotStep}
                            forgotEmail={forgotEmail}
                            forgotOtp={forgotOtp}
                            forgotNewPassword={forgotNewPassword}
                            forgotConfirmPassword={forgotConfirmPassword}
                            forgotLoading={forgotLoading}
                            resendOtpLoading={resendOtpLoading}
                            forgotError={forgotError}
                            showNewPassword={showNewPassword}
                            showConfirmPassword={showConfirmPassword}
                            cooldown={cooldown}
                            otpRefs={otpRefs}
                            onClose={closeForgotPassword}
                            onSendOtp={handleSendOtp}
                            onResendOtp={handleResendOtp}
                            onVerifyOtp={handleVerifyOtp}
                            onResetPassword={handleResetPassword}
                            onOtpChange={handleOtpChange}
                            onOtpKeyDown={handleOtpKeyDown}
                            onOtpPaste={handleOtpPaste}
                            onForgotEmailChange={setForgotEmail}
                            onForgotNewPasswordChange={setForgotNewPassword}
                            onForgotConfirmPasswordChange={setForgotConfirmPassword}
                            onToggleNewPassword={() => setShowNewPassword((value) => !value)}
                            onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
                            onBackToOtp={() => setForgotStep("otp")}
                            onClearError={() => setForgotError("")}
                        />
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
