"use client";

import { Bot, Zap } from "lucide-react";
import { aiBreakdownItems, aiHighlights } from "./get-started-content";

export default function GetStartedAISpotlight() {
    return (
        <section className="py-20 sm:py-24 lg:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F5EE30]/[0.02] to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div className="relative order-2 lg:order-1">
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[#F5EE30]" />
                                </div>
                                <div className="bg-white/[0.05] rounded-xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                                    I&apos;ve analyzed the &quot;Website Redesign&quot; project. Based on similar past projects,
                                    I estimate <span className="text-[#F5EE30] font-bold">120 hours</span> of work.
                                    Here&apos;s the task breakdown:
                                </div>
                            </div>
                            <div className="pl-11 space-y-2 text-sm">
                                {aiBreakdownItems.map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-gray-400">
                                        <div className="w-1.5 h-1.5 bg-[#F5EE30] rounded-full" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-start gap-3 pt-2">
                                <div className="w-8 h-8 rounded-full bg-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[#F5EE30]" />
                                </div>
                                <div className="bg-white/[0.05] rounded-xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                                    Shall I create these tasks, assign team members, and generate the client invoice for{" "}
                                    <span className="text-[#F5EE30] font-bold">INR 2,40,000</span>?
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 order-1 lg:order-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-[#F5EE30] rounded-sm" />
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
                            Singularity AI doesn&apos;t just answer questions. It takes action:
                            break down projects, estimate costs, process payroll, create invoices,
                            onboard employees, and manage refunds through simple conversation.
                        </p>
                        <ul className="space-y-3 pt-2">
                            {aiHighlights.map((item) => (
                                <li key={item} className="flex items-start gap-3 text-gray-400">
                                    <Zap className="w-4 h-4 text-[#F5EE30] mt-1 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
