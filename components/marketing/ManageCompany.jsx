"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, Wallet, Users } from "lucide-react";

const features = [
    {
        icon: BarChart3,
        title: "Smart Project Tracking",
        description:
            "Kanban boards, task assignments, deadlines, and real-time progress — all in one powerful view.",
    },
    {
        icon: Bot,
        title: "AI-Powered Assistant",
        description:
            "Singularity AI breaks down tasks, estimates hours, manages payroll, and handles invoicing — just ask.",
    },
    {
        icon: Wallet,
        title: "Financial Intelligence",
        description:
            "Track income, expenses, invoices, and payroll. Get instant financial insights with AI analysis.",
    },
    {
        icon: Users,
        title: "Team & Client Portal",
        description:
            "Manage your team, track workloads, handle leave requests, and give clients their own branded portal.",
    },
];

export default function ManageCompanySection() {
    return (
        <section className="bg-black text-white py-16 sm:py-20 lg:py-24 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F5EE30]/5 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm"></div>
                    <span className="text-white text-sm sm:text-base font-glacial-bold uppercase tracking-widest">
                        Built For Agencies
                    </span>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 sm:mb-20">
                    {/* Left - Text Content */}
                    <div className="space-y-6">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase leading-tight">
                            Manage Your Entire
                            <br />
                            <span className="text-[#F5EE30]">Company With AI</span>
                        </h2>

                        <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl">
                            Your all-in-one agency management platform. Track projects, manage
                            finances, automate invoicing, and let AI handle the heavy
                            lifting — so you can focus on growing your business.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link
                                href="/get-started"
                                className="group inline-flex items-center gap-2 bg-[#F5EE30] text-black font-bold uppercase text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,238,48,0.3)]"
                            >
                                Get Started
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link
                                href="/services/manage-company"
                                className="inline-flex items-center gap-2 border border-white/30 text-white font-bold uppercase text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:border-[#F5EE30] hover:text-[#F5EE30] transition-all duration-300"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>

                    {/* Right - Dashboard Mockup */}
                    <div className="relative">
                        {/* Glow behind image */}
                        <div className="absolute -inset-4 bg-gradient-to-br from-[#F5EE30]/10 via-transparent to-[#F5EE30]/5 rounded-2xl blur-xl"></div>
                        <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-[#F5EE30]/5">
                            <Image
                                src="/dashboard-mockup.png"
                                alt="Agency OS Dashboard — AI-powered company management platform"
                                width={800}
                                height={500}
                                className="w-full h-auto"
                                priority
                            />
                            {/* Glass overlay at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {features.map((feature, index) => {
                        const IconComponent = feature.icon;
                        return (
                            <div
                                key={index}
                                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 sm:p-8 hover:border-[#F5EE30]/30 hover:bg-[#F5EE30]/[0.03] transition-all duration-500"
                            >
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-lg bg-[#F5EE30]/10 flex items-center justify-center mb-5 group-hover:bg-[#F5EE30]/20 transition-colors duration-300">
                                    <IconComponent className="w-6 h-6 text-[#F5EE30]" />
                                </div>

                                {/* Title */}
                                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide mb-3 group-hover:text-[#F5EE30] transition-colors duration-300">
                                    {feature.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
