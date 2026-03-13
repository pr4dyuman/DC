
"use client";

import { useState, useEffect } from "react";
import { authenticateUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/footer";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authChecked, setAuthChecked] = useState(false);

    // Redirect logged-in users to dashboard
    useEffect(() => {
        const isLoggedIn = document.cookie.split(";").some((c) => c.trim().startsWith("logged_in="));
        if (isLoggedIn) {
            window.location.href = "/dashboard";
            return;
        }
        setAuthChecked(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
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

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#F5EE30] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-glacial">
            <Navigation />

            <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-block mb-6">
                            <span className="text-[#F5EE30] text-6xl font-suifak tracking-tight">DC</span>
                        </Link>
                        <h1 className="text-3xl sm:text-4xl font-etna uppercase tracking-wider mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Sign in to access your agency portal
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300"
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300"
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            className="w-full py-3 bg-[#F5EE30] text-black font-glacial-bold uppercase tracking-widest text-sm hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            type="submit"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-gray-500 text-xs uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Get Started */}
                    <Link
                        href="/get-started"
                        className="block w-full py-3 border-2 border-[#F5EE30] text-[#F5EE30] font-glacial-bold uppercase tracking-widest text-sm text-center hover:bg-[#F5EE30] hover:text-black transition-all duration-300"
                    >
                        Get Started — Free 7-Day Trial
                    </Link>

                    {/* Back to home */}
                    <div className="text-center mt-8">
                        <Link href="/" className="text-gray-500 text-sm hover:text-[#F5EE30] transition-colors">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
