"use client";

import Link from "next/link";
import { Eye, Edit, Ban, CheckCircle, Trash2 } from "lucide-react";
import { suspendAgency, activateAgency, deleteAgency } from "@/lib/actions/super-admin";
import { useState } from "react";

export default function AgencyTable({ agencies }: { agencies: any[] }) {
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    
    const filteredAgencies = agencies.filter((agency) => {
        const matchesFilter = filter === "all" || agency.status === filter || agency.plan === filter;
        const matchesSearch = agency.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    
    const handleSuspend = async (agencyId: string) => {
        if (!confirm("Are you sure you want to suspend this agency?")) return;
        await suspendAgency(agencyId, "Suspended by super admin");
        window.location.reload();
    };
    
    const handleActivate = async (agencyId: string) => {
        await activateAgency(agencyId);
        window.location.reload();
    };
    
    const handleDelete = async (agencyId: string) => {
        if (!confirm("⚠️ WARNING: This will permanently delete the agency and ALL its data. This cannot be undone. Are you absolutely sure?")) return;
        if (!confirm("Last chance! Type 'DELETE' to confirm.")) return;
        await deleteAgency(agencyId);
        window.location.reload();
    };
    
    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search agencies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Agencies</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="free">Free Plan</option>
                        <option value="pro">Pro Plan</option>
                        <option value="enterprise">Enterprise Plan</option>
                    </select>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Agency
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Plan
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Users
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Projects
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAgencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="font-medium text-gray-900">{agency.name}</div>
                                        <div className="text-sm text-gray-500">{agency.slug}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        agency.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                        agency.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {agency.plan.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        agency.status === 'active' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {agency.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {agency.stats?.users || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {agency.stats?.projects || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${(agency.stats?.revenue || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(agency.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/super-admin/agencies/${agency.id}`}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        {agency.status === 'active' ? (
                                            <button
                                                onClick={() => handleSuspend(agency.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Suspend"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleActivate(agency.id)}
                                                className="text-green-600 hover:text-green-900"
                                                title="Activate"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(agency.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {filteredAgencies.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No agencies found</p>
                </div>
            )}
        </div>
    );
}
