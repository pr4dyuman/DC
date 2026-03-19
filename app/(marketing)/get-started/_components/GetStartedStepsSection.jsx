"use client";

import { steps } from "./get-started-content";

export default function GetStartedStepsSection() {
    return (
        <section className="py-20 sm:py-24 lg:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-8 h-px bg-[#F5EE30]" />
                        <span className="text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                            Simple Setup
                        </span>
                        <div className="w-8 h-px bg-[#F5EE30]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase">
                        Up and Running In <span className="text-[#F5EE30]">Minutes</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div key={step.number} className="relative text-center">
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#F5EE30]/30 to-transparent" />
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
    );
}
