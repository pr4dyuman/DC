"use client";

import { ArrowRight } from "lucide-react";
import { heroStats } from "./get-started-content";

export default function GetStartedHero() {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F5EE30]/[0.04] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#F5EE30]/20 to-transparent" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-36 pb-10 text-center">
                <div className="inline-flex items-center gap-2 border border-[#F5EE30]/30 bg-[#F5EE30]/[0.05] rounded-full px-5 py-2 mb-8">
                    <div className="w-2 h-2 bg-[#F5EE30] rounded-full animate-pulse" />
                    <span className="text-xs sm:text-sm font-glacial-bold uppercase tracking-widest text-[#F5EE30]">
                        7-Day Free Trial - No Credit Card Required
                    </span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold uppercase leading-[0.9] mb-6 sm:mb-8">
                    Stop Juggling.
                    <br />
                    <span className="text-[#F5EE30]">Start Scaling.</span>
                </h1>

                <p className="text-gray-400 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12">
                    The all-in-one platform where AI manages your projects, finances,
                    team, and clients so you can focus on growing your agency.
                </p>

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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto mb-16 sm:mb-20">
                    {heroStats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F5EE30] mb-1">{stat.value}</div>
                            <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
