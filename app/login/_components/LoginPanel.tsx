"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type LoginPanelProps = {
    email: string;
    password: string;
    loading: boolean;
    showPassword: boolean;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onTogglePassword: () => void;
    onForgotPassword: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function LoginPanel({
    email,
    password,
    loading,
    showPassword,
    onEmailChange,
    onPasswordChange,
    onTogglePassword,
    onForgotPassword,
    onSubmit,
}: LoginPanelProps) {
    return (
        <>
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

            <form onSubmit={onSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300 mb-2" htmlFor="login-email">
                        Email
                    </label>
                    <input
                        className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300"
                        id="login-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => onEmailChange(event.target.value)}
                        required
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-glacial-bold uppercase tracking-wider text-gray-300" htmlFor="login-password">
                            Password
                        </label>
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-xs text-[#F5EE30]/70 hover:text-[#F5EE30] transition-colors duration-300 uppercase tracking-wider"
                            id="forgot-password-link"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            className="w-full bg-transparent border-2 border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:border-[#F5EE30] focus:outline-none transition-colors duration-300 pr-12"
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => onPasswordChange(event.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={onTogglePassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
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

            <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-xs uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10" />
            </div>

            <Link
                href="/get-started?mode=auth#signup"
                className="block w-full py-3 border-2 border-[#F5EE30] text-[#F5EE30] font-glacial-bold uppercase tracking-widest text-sm text-center hover:bg-[#F5EE30] hover:text-black transition-all duration-300"
            >
                Get Started - Free 7-Day Trial
            </Link>

            <div className="text-center mt-8">
                <Link href="/" className="text-gray-500 text-sm hover:text-[#F5EE30] transition-colors">
                    ← Back to Home
                </Link>
            </div>
        </>
    );
}
