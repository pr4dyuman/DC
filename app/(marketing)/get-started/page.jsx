"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
    ArrowRight,
    BarChart3,
    Bot,
    Wallet,
    Users,
    CheckCircle2,
    Zap,
    Shield,
    Clock,
    FileText,
    TrendingUp,
    MessageSquare,
    CalendarDays,
    BriefcaseBusiness,
    Send,
} from "lucide-react";

const platformFeatures = [
    {
        icon: BarChart3,
        title: "Project Management",
        description:
            "Kanban boards, task assignments, deadlines, priority tracking, and real-time progress updates. Never miss a deadline again.",
        highlights: [
            "Drag-and-drop Kanban boards",
            "Task assignment & deadlines",
            "Progress tracking per project",
            "Client-specific project views",
        ],
    },
    {
        icon: Bot,
        title: "AI-Powered Assistant",
        description:
            "Singularity AI breaks down tasks, estimates hours, manages payroll, creates invoices, and answers business questions — all through natural conversation.",
        highlights: [
            "Task breakdown & hour estimation",
            "Automated payroll processing",
            "Invoice generation via chat",
            "Business insights on demand",
        ],
    },
    {
        icon: Wallet,
        title: "Financial Intelligence",
        description:
            "Complete financial control — track income, expenses, create invoices, manage payroll, and get instant AI-powered financial reports.",
        highlights: [
            "Income & expense tracking",
            "One-click invoice creation",
            "Payroll management",
            "AI financial analysis",
        ],
    },
    {
        icon: Users,
        title: "Team Management",
        description:
            "Manage your entire team from one place. Track workloads, handle leave requests, monitor performance, and assign roles with granular permissions.",
        highlights: [
            "Role-based access control",
            "Leave request management",
            "Workload & performance tracking",
            "Team activity timeline",
        ],
    },
    {
        icon: BriefcaseBusiness,
        title: "Client Portal",
        description:
            "Give your clients their own branded portal to view project progress, approve deliverables, and communicate directly with your team.",
        highlights: [
            "Branded client dashboards",
            "Project progress visibility",
            "Direct client messaging",
            "Asset & file sharing",
        ],
    },
    {
        icon: MessageSquare,
        title: "Team Communication",
        description:
            "Built-in messaging system with real-time notifications, project-based channels, and file sharing — everything stays in context.",
        highlights: [
            "Real-time team messaging",
            "Project-based discussions",
            "File & asset sharing",
            "Activity notifications",
        ],
    },
];

const steps = [
    {
        number: "01",
        icon: BriefcaseBusiness,
        title: "Sign Up Your Company",
        description:
            "Create your company account in minutes. Add your team members, set up roles, and configure permissions.",
    },
    {
        number: "02",
        icon: Zap,
        title: "Set Up Your Workspace",
        description:
            "Add clients, create projects, and customize your dashboard. Import existing data or start fresh.",
    },
    {
        number: "03",
        icon: TrendingUp,
        title: "Scale With AI",
        description:
            "Let Singularity AI handle the heavy lifting — task estimation, payroll, invoicing, and business insights — while you focus on growth.",
    },
];

export default function GetStartedPage() {
    const [formData, setFormData] = useState({
        agencyName: "",
        ownerName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        industry: "",
        teamSize: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agencyName: formData.agencyName,
                    ownerName: formData.ownerName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    industry: formData.industry,
                    teamSize: formData.teamSize,
                }),
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = data.redirectTo || "/dashboard";
            } else {
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass =
        "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5EE30]/50 transition-colors";

    return (
        <div className="bg-black text-white font-glacial">
            {/* ═══════════════ HERO ═══════════════ */}
            <section className="relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F5EE30]/[0.04] rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#F5EE30]/20 to-transparent"></div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-36 pb-10 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 border border-[#F5EE30]/30 bg-[#F5EE30]/[0.05] rounded-full px-5 py-2 mb-8">
                        <div className="w-2 h-2 bg-[#F5EE30] rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                            7-Day Free Trial — No Credit Card Required
                        </span>
                    </div>

                    {/* Main headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold uppercase leading-[0.9] mb-6 sm:mb-8">
                        Stop Juggling.
                        <br />
                        <span className="text-[#F5EE30]">Start Scaling.</span>
                    </h1>

                    <p className="text-gray-400 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12">
                        The all-in-one platform where AI manages your projects, finances,
                        team, and clients — so you can focus on what matters: growing your agency.
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-wrap justify-center gap-4 mb-16 sm:mb-20">
                        <a
                            href="#signup"
                            className="group inline-flex items-center gap-2 bg-[#F5EE30] text-black font-bold uppercase text-sm sm:text-base px-8 sm:px-10 py-4 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,238,48,0.25)]"
                        >
                            Start Free Trial
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </a>
                        <a
                            href="#features"
                            className="inline-flex items-center gap-2 border border-white/20 text-white font-bold uppercase text-sm sm:text-base px-8 sm:px-10 py-4 rounded-full hover:border-[#F5EE30] hover:text-[#F5EE30] transition-all duration-300"
                        >
                            See How It Works
                        </a>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto mb-16 sm:mb-20">
                        {[
                            { value: "50+", label: "Agencies Onboard" },
                            { value: "10K+", label: "Tasks Managed" },
                            { value: "99.9%", label: "Uptime" },
                            { value: "5 min", label: "Setup Time" },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5EE30] mb-1">{stat.value}</div>
                                <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ PLATFORM FEATURES ═══════════════ */}
            <section id="features" className="py-20 sm:py-24 lg:py-32 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#F5EE30]/3 rounded-full blur-[200px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Section header */}
                    <div className="text-center mb-16 sm:mb-20">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
                            <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                                Everything You Need
                            </span>
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase mb-6">
                            One Platform,
                            <br />
                            <span className="text-[#F5EE30]">Unlimited Power</span>
                        </h2>
                        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                            Every tool your agency needs — from project tracking to AI-powered
                            automation — integrated into one seamless experience.
                        </p>
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {platformFeatures.map((feature, index) => {
                            const IconComponent = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 sm:p-8 hover:border-[#F5EE30]/30 hover:bg-[#F5EE30]/[0.02] transition-all duration-500"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[#F5EE30]/10 flex items-center justify-center mb-6 group-hover:bg-[#F5EE30]/20 transition-colors duration-300">
                                        <IconComponent className="w-7 h-7 text-[#F5EE30]" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-wide mb-3 group-hover:text-[#F5EE30] transition-colors duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-5 group-hover:text-gray-300 transition-colors duration-300">
                                        {feature.description}
                                    </p>
                                    <ul className="space-y-2.5">
                                        {feature.highlights.map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2.5 text-sm text-gray-500 group-hover:text-gray-400 transition-colors"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-[#F5EE30]/60 mt-0.5 flex-shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════ AI SPOTLIGHT ═══════════════ */}
            <section className="py-20 sm:py-24 lg:py-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F5EE30]/[0.02] to-transparent pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left - AI visual */}
                        <div className="relative order-2 lg:order-1">
                            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-[#F5EE30]" />
                                    </div>
                                    <div className="bg-white/[0.05] rounded-xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                                        I&apos;ve analyzed the &quot;Website Redesign&quot; project.
                                        Based on similar past projects, I estimate{" "}
                                        <span className="text-[#F5EE30] font-bold">120 hours</span>{" "}
                                        of work. Here&apos;s the task breakdown:
                                    </div>
                                </div>
                                <div className="pl-11 space-y-2 text-sm">
                                    {["UI/UX Design — 35 hours", "Frontend Development — 50 hours", "Backend Integration — 25 hours", "Testing & QA — 10 hours"].map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-gray-400">
                                            <div className="w-1.5 h-1.5 bg-[#F5EE30] rounded-full"></div>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-start gap-3 pt-2">
                                    <div className="w-8 h-8 rounded-full bg-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-[#F5EE30]" />
                                    </div>
                                    <div className="bg-white/[0.05] rounded-xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                                        Shall I create these tasks, assign team members, and
                                        generate the client invoice for{" "}
                                        <span className="text-[#F5EE30] font-bold">₹2,40,000</span>?
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - Text */}
                        <div className="space-y-6 order-1 lg:order-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm"></div>
                                <span className="text-sm font-glacial-bold uppercase tracking-widest text-gray-400">
                                    Meet Singularity
                                </span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-tight">
                                Your AI
                                <br />
                                <span className="text-[#F5EE30]">Business Partner</span>
                            </h2>
                            <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-lg">
                                Singularity AI doesn&apos;t just answer questions — it takes
                                action. Break down projects, estimate costs, process payroll,
                                create invoices, onboard employees, and manage refunds — all
                                through simple conversation.
                            </p>
                            <ul className="space-y-3 pt-2">
                                {[
                                    "Break down complex projects into tasks automatically",
                                    "Estimate hours based on your past project data",
                                    "Process payroll and generate payslips",
                                    "Create and send professional invoices",
                                    "Manage team onboarding and offboarding",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-400">
                                        <Zap className="w-4 h-4 text-[#F5EE30] mt-1 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section className="py-20 sm:py-24 lg:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
                            <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                                Simple Setup
                            </span>
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase">
                            Up & Running In <span className="text-[#F5EE30]">Minutes</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {steps.map((step, index) => {
                            const IconComponent = step.icon;
                            return (
                                <div key={index} className="relative text-center">
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#F5EE30]/30 to-transparent"></div>
                                    )}
                                    <div className="text-6xl sm:text-7xl font-bold text-white/[0.04] font-etna absolute top-0 left-1/2 -translate-x-1/2">
                                        {step.number}
                                    </div>
                                    <div className="relative w-20 h-20 rounded-2xl bg-[#F5EE30]/10 border border-[#F5EE30]/20 flex items-center justify-center mx-auto mb-6">
                                        <IconComponent className="w-9 h-9 text-[#F5EE30]" />
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-wide mb-3">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                        {step.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════ SIGNUP FORM ═══════════════ */}
            <section id="signup" className="py-20 sm:py-24 lg:py-32 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5EE30]/5 rounded-full blur-[180px] pointer-events-none"></div>

                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
                            <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                                Create Your Account
                            </span>
                            <div className="w-8 h-px bg-[#F5EE30]"></div>
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
                        onSubmit={handleSubmit}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-10"
                    >
                        {/* Error display */}
                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Agency Name */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Agency / Company Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.agencyName}
                                    onChange={(e) => setFormData((p) => ({ ...p, agencyName: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Your Agency Name"
                                />
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Your Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.ownerName}
                                    onChange={(e) => setFormData((p) => ({ ...p, ownerName: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Admin / Owner Name"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                    className={inputClass}
                                    placeholder="you@company.com"
                                />
                                <p className="text-xs text-gray-600 mt-1.5">This will be your login email</p>
                            </div>

                            {/* Password */}
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
                                            onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                                            className={inputClass + " pr-12"}
                                            placeholder="Min 6 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
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
                                        onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                                        className={inputClass}
                                        placeholder="Re-enter password"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                                    className={inputClass}
                                    placeholder="+91 98765 43210"
                                />
                            </div>

                            {/* Industry & Team Size */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                        Industry
                                    </label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => setFormData((p) => ({ ...p, industry: e.target.value }))}
                                        className={inputClass + " appearance-none"}
                                    >
                                        <option value="" className="bg-black">Select industry</option>
                                        <option value="marketing" className="bg-black">Marketing Agency</option>
                                        <option value="tech" className="bg-black">Tech / Software</option>
                                        <option value="design" className="bg-black">Design Studio</option>
                                        <option value="media" className="bg-black">Media / Production</option>
                                        <option value="consulting" className="bg-black">Consulting</option>
                                        <option value="ecommerce" className="bg-black">E-Commerce</option>
                                        <option value="other" className="bg-black">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2 font-glacial-bold uppercase tracking-wide">
                                        Team Size
                                    </label>
                                    <select
                                        value={formData.teamSize}
                                        onChange={(e) => setFormData((p) => ({ ...p, teamSize: e.target.value }))}
                                        className={inputClass + " appearance-none"}
                                    >
                                        <option value="" className="bg-black">Select team size</option>
                                        <option value="1-5" className="bg-black">1–5 people</option>
                                        <option value="6-15" className="bg-black">6–15 people</option>
                                        <option value="16-50" className="bg-black">16–50 people</option>
                                        <option value="50+" className="bg-black">50+ people</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Trial info */}
                        <div className="mt-8 mb-6 flex items-start gap-3 bg-[#F5EE30]/[0.04] border border-[#F5EE30]/10 rounded-xl px-4 py-3.5">
                            <Shield className="w-5 h-5 text-[#F5EE30] mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-400">
                                <span className="text-[#F5EE30] font-bold">7-day free trial</span> with full Pro access including AI Assistant, unlimited projects, financial tools, and team management. No credit card required.
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full group inline-flex items-center justify-center gap-3 bg-[#F5EE30] text-black font-bold uppercase text-base px-10 py-4 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,238,48,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                "Creating Your Account..."
                            ) : (
                                <>
                                    Create Account & Start Trial
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-sm text-gray-600 mt-4">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#F5EE30] hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </section>
        </div>
    );
}