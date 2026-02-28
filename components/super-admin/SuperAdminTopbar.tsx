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
        <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground">Agency View</h2>

                    {/* Agency Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        >
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                                {currentAgency ? currentAgency.name : "All Agencies"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {isOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border z-20 max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <button
                                            onClick={() => handleSwitch(null)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!selectedAgency
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-muted text-foreground"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                <span className="font-medium">All Agencies</span>
                                            </div>
                                        </button>

                                        <div className="border-t border-border my-2" />

                                        {loading ? (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                                        ) : (
                                            agencies.map((agency) => (
                                                <button
                                                    key={agency.id}
                                                    onClick={() => handleSwitch(agency.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedAgency === agency.id
                                                            ? "bg-primary/10 text-primary"
                                                            : "hover:bg-muted text-foreground"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{agency.name}</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                                                                agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                                                                    'bg-muted text-muted-foreground'
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
                        <p className="text-sm font-medium text-foreground">Super Admin</p>
                        <p className="text-xs text-muted-foreground">Full System Access</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
