"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [email, setEmail] = useState("admin@agency.com"); // Pre-fill for demo
    const [password, setPassword] = useState("password123");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (email === "admin@agency.com" && password === "password123") {
            router.push("/dashboard");
        } else {
            setError("Invalid credentials. Try admin@agency.com / password123");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-muted/30">
            {/* Left Column - Form */}
            <div className="flex flex-col items-center justify-center p-8 bg-background relative">
                <div className="w-full max-w-sm space-y-8">
                    <div className="space-y-2 text-center">
                        <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 mb-4">
                            <div className="h-6 w-6 text-primary rounded-sm bg-primary" /> {/* Placeholder Logo */}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">AgencyOS</h1>
                        <p className="text-muted-foreground">Operating System for Modern Agencies</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                                        placeholder="name@agency.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                        Password
                                    </label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center w-full rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking login, you agree to our{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>

            {/* Right Column - Visual */}
            <div className="hidden lg:flex flex-col justify-center p-12 bg-zinc-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-800" />
                <div className="relative z-10 max-w-lg mx-auto space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold">Manage your agency with precision.</h2>
                        <p className="text-zinc-400">
                            Track projects, finances, and team performance in one unified operating system. Built for scalability.
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm shadow-2xl">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <div className="h-5 w-5 rounded-full bg-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Revenue Target Reached</p>
                                    <p className="text-xs text-zinc-400">Just now</p>
                                </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full w-3/4 bg-indigo-500 rounded-full" />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-400">
                                <span>$124,000</span>
                                <span>$150,000 Goal</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Gradients */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-3xl opacity-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl opacity-20 pointer-events-none" />
            </div>
        </div>
    );
}
