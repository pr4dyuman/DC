"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";

const subscribe = () => () => {};

export default function NotFound() {
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navigation />

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="max-w-4xl w-full text-center">
                    {/* Animated 404 */}
                    <div className="mb-8 relative">
                        <h1
                            className={`text-[clamp(4rem,15vw,12rem)] font-bold leading-none transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
                                }`}
                        >
                            <span className="text-white">4</span>
                            <span className="text-[#F5EE30]">0</span>
                            <span className="text-white">4</span>
                        </h1>

                        {/* Decorative elements */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                            <div className="absolute top-0 left-1/4 w-2 h-2 bg-[#F5EE30] rounded-full animate-pulse"></div>
                            <div className="absolute bottom-0 right-1/4 w-2 h-2 bg-[#F5EE30] rounded-full animate-pulse delay-150"></div>
                        </div>
                    </div>

                    {/* Error Message */}
                    <div
                        className={`mb-12 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                            }`}
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase mb-4 tracking-wider">
                            Page Not Found
                        </h2>
                        <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                            Oops! The page you&apos;re looking for seems to have flown away.
                            <br className="hidden sm:block" />
                            Let&apos;s get you back on track.
                        </p>
                    </div>

                    {/* Crow Illustration */}
                    <div
                        className={`mb-12 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                            }`}
                    >
                        <div className="inline-block relative">
                            <svg
                                width="120"
                                height="120"
                                viewBox="0 0 120 120"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="animate-bounce-slow"
                            >
                                <path
                                    d="M60 20C45 20 35 30 35 45C35 50 36 54 38 58L25 70L35 75L40 65C45 70 52 73 60 73C68 73 75 70 80 65L85 75L95 70L82 58C84 54 85 50 85 45C85 30 75 20 60 20Z"
                                    fill="#F5EE30"
                                />
                                <circle cx="52" cy="42" r="3" fill="black" />
                                <circle cx="68" cy="42" r="3" fill="black" />
                                <path d="M55 50Q60 55 65 50" stroke="black" strokeWidth="2" fill="none" />
                            </svg>

                            <div className="absolute inset-0 bg-[#F5EE30] opacity-20 blur-2xl rounded-full"></div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                        className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                            }`}
                    >
                        <Link
                            href="/"
                            className="group relative px-8 py-4 bg-[#F5EE30] text-black font-bold uppercase tracking-wider rounded-none overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(245,238,48,0.5)]"
                        >
                            <span className="relative z-10">Go Home</span>
                            <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                        </Link>

                        <Link
                            href="/services/web-development"
                            className="group relative px-8 py-4 bg-transparent border-2 border-[#F5EE30] text-[#F5EE30] font-bold uppercase tracking-wider rounded-none overflow-hidden transition-all duration-300 hover:scale-105 hover:bg-[#F5EE30] hover:text-black"
                        >
                            <span className="relative z-10">View Services</span>
                        </Link>
                    </div>

                    {/* Additional Help Text */}
                    <div
                        className={`mt-16 transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <p className="text-gray-500 text-sm">
                            Error Code: 404 | Lost in the digital void
                        </p>
                    </div>
                </div>
            </main>

            <Footer />

        </div>
    );
}
