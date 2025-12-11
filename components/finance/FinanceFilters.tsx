"use client";

import { Select, SelectItem } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface FinanceFiltersProps {
    projects: { id: string; title: string; client: string }[];
    users: { id: string; name: string }[];
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
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Show Project Dropdown if User and Category are not active */}
            {!isUserActive && !isCategoryActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentProject} onValueChange={(val) => updateFilter("projectId", val)}>
                        <SelectItem value="all">Select Project</SelectItem>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.title}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            )}

            {/* Show User Dropdown if Project and Category are not active */}
            {!isProjectActive && !isCategoryActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentUser} onValueChange={(val) => updateFilter("userId", val)}>
                        <SelectItem value="all">Select Team Member</SelectItem>
                        {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                {u.name}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            )}

            {/* Show Others Dropdown if Project and User are not active */}
            {!isProjectActive && !isUserActive && (
                <div className="w-full sm:w-[250px]">
                    <Select value={currentCategory} onValueChange={(val) => updateFilter("category", val)}>
                        <SelectItem value="all">Others</SelectItem>
                        <SelectItem value="Internal Transfer">Internal Transfers</SelectItem>
                        <SelectItem value="Investor">Investors</SelectItem>
                    </Select>
                </div>
            )}

            {/* Back Button if any filter is active */}
            {(isProjectActive || isUserActive || isCategoryActive) && (
                <button
                    onClick={clearFilters}
                    className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                    Back to Overview
                </button>
            )}
        </div>
    );
}
