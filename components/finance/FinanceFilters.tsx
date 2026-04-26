"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface FinanceFiltersProps {
    projects: { id: string; title: string; client: string }[];
    users: { id: string; name: string; jobTitle?: string }[];
}

export function FinanceFilters({ projects, users }: FinanceFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentProject = searchParams.get("projectId") || "all";
    const currentUser = searchParams.get("userId") || "all";
    const currentCategory = searchParams.get("category") || "all";

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(); // Reset params to ensure exclusivity
        if (value !== "all") {
            params.set(key, value);
        }
        router.push(`/dashboard/finance?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push("/dashboard/finance");
    };

    const isProjectActive = currentProject !== "all";
    const isUserActive = currentUser !== "all";
    const isCategoryActive = currentCategory !== "all";

    return (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Show Project Dropdown if User and Category are not active */}
            {!isUserActive && !isCategoryActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentProject} onValueChange={(val) => updateFilter("projectId", val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.title} ({p.client})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Show User Dropdown if Project and Category are not active */}
            {!isProjectActive && !isCategoryActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentUser} onValueChange={(val) => updateFilter("userId", val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Team Member" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Team Members</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name} ({u.jobTitle || 'Team Member'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Show Others Dropdown if Project and User are not active */}
            {!isProjectActive && !isUserActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentCategory} onValueChange={(val) => updateFilter("category", val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Others" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Others</SelectItem>
                            <SelectItem value="Tax">Tax Payments</SelectItem>
                            <SelectItem value="Reimbursement">Reimbursements</SelectItem>
                            <SelectItem value="Retainer">Retainers</SelectItem>
                            <SelectItem value="Freelancer">Freelancers</SelectItem>
                            <SelectItem value="Internal Transfer">Internal Transfers</SelectItem>
                            <SelectItem value="Investor">Investors</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Back Button if any filter is active */}
            {(isProjectActive || isUserActive || isCategoryActive) && (
                <button
                    onClick={clearFilters}
                    className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-primary sm:w-auto"
                >
                    Back to Overview
                </button>
            )}
        </div>
    );
}
