"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/actions";
import GetStartedLoadingScreen from "./_components/GetStartedLoadingScreen";
import GetStartedHero from "./_components/GetStartedHero";
import GetStartedFeaturesSection from "./_components/GetStartedFeaturesSection";
import GetStartedAISpotlight from "./_components/GetStartedAISpotlight";
import GetStartedStepsSection from "./_components/GetStartedStepsSection";
import GetStartedSignupForm from "./_components/GetStartedSignupForm";

export default function GetStartedPage() {
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

    if (!authChecked) {
        return <GetStartedLoadingScreen />;
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
