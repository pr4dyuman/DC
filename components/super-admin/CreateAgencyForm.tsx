"use client";

import { useState } from "react";
import { createAgency } from "@/lib/actions/super-admin";
import { useRouter } from "next/navigation";

export default function CreateAgencyForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [formData, setFormData] = useState({
        name: "",
        ownerEmail: "",
        ownerPassword: "",
        plan: "free" as "free" | "pro" | "enterprise"
    });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            await createAgency(formData);
            router.push("/super-admin/agencies");
        } catch (err: any) {
            setError(err.message || "Failed to create agency");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agency Name *
                </label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Acme Corporation"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email *
                </label>
                <input
                    type="email"
                    required
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="owner@acme.com"
                />
                <p className="text-sm text-gray-500 mt-1">This will be the admin account for the agency</p>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Password *
                </label>
                <input
                    type="password"
                    required
                    value={formData.ownerPassword}
                    onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={8}
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan *
                </label>
                <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="free">Free (5 users, 10 projects)</option>
                    <option value="pro">Pro (25 users, 100 projects)</option>
                    <option value="enterprise">Enterprise (Unlimited)</option>
                </select>
            </div>
            
            <div className="flex items-center gap-4 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Agency"}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
