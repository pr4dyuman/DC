"use client";

import { CheckCircle2 } from "lucide-react";
import { platformFeatures } from "./get-started-content";

export default function GetStartedFeaturesSection() {
    return (
        <section id="features" className="py-20 sm:py-24 lg:py-32 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#F5EE30]/3 rounded-full blur-[200px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16 sm:mb-20">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-8 h-px bg-[#F5EE30]" />
                        <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                            Everything You Need
                        </span>
                        <div className="w-8 h-px bg-[#F5EE30]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase mb-6">
                        One Platform,
                        <br />
                        <span className="text-[#F5EE30]">Unlimited Power</span>
                    </h2>
                    <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Every tool your agency needs, from project tracking to AI-powered
                        automation, integrated into one seamless experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {platformFeatures.map((feature) => {
                        const IconComponent = feature.icon;
                        return (
                            <div
                                key={feature.title}
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
                                    {feature.highlights.map((item) => (
                                        <li
                                            key={item}
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
    );
}
