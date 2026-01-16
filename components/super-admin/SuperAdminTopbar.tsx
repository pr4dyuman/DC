"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { getAllAgencies, switchAgency, clearAgencySelection } from "@/lib/agency-context";

export default function SuperAdminTopbar() {
    const [agencies, setAgencies] = useState<any[]>([]);
    const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadAgencies();
        // Get selected agency from cookie
        const cookies = document.cookie.split(';');
        const selectedCookie = cookies.find(c => c.trim().startsWith('selectedAgencyId='));
        if (selectedCookie) {
            setSelectedAgency(selectedCookie.split('=')[1]);
        }
    }, []);
    
    const loadAgencies = async () => {
        try {
            const data = await getAllAgencies();
            setAgencies(data);
        } catch (error) {
            console.error('Error loading agencies:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSwitch = async (agencyId: string | null) => {
        try {
            if (agencyId) {
                await switchAgency(agencyId);
                setSelectedAgency(agencyId);
            } else {
                await clearAgencySelection();
                setSelectedAgency(null);
            }
            setIsOpen(false);
            window.location.reload(); // Refresh to show new agency data
        } catch (error) {
            console.error('Error switching agency:', error);
        }
    };
    
    const currentAgency = agencies.find(a => a.id === selectedAgency);
    
    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">Agency View</h2>
                    
                    {/* Agency Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Building2 className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                                {currentAgency ? currentAgency.name : "All Agencies"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {isOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <button
                                            onClick={() => handleSwitch(null)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                                !selectedAgency
                                                    ? "bg-blue-50 text-blue-900"
                                                    : "hover:bg-gray-100 text-gray-900"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                <span className="font-medium">All Agencies</span>
                                            </div>
                                        </button>
                                        
                                        <div className="border-t border-gray-200 my-2" />
                                        
                                        {loading ? (
                                            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                                        ) : (
                                            agencies.map((agency) => (
                                                <button
                                                    key={agency.id}
                                                    onClick={() => handleSwitch(agency.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                                        selectedAgency === agency.id
                                                            ? "bg-blue-50 text-blue-900"
                                                            : "hover:bg-gray-100 text-gray-900"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{agency.name}</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            agency.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                                            agency.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {agency.plan}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Super Admin</p>
                        <p className="text-xs text-gray-500">Full System Access</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
