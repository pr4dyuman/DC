"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

interface MobileSidebarProps {
    currentUserId?: string;
    currentUserUsername?: string;
    currentUserRole?: string;
    agencyName?: string;
    agencyLogo?: string;
    agencyPlan?: string;
    agencyStatus?: string;
    agencyHasAIBlogger?: boolean;
    currentUserCanUseAI?: boolean;
}

const subscribe = () => () => { };

export function MobileSidebar({
    currentUserId,
    currentUserUsername,
    currentUserRole,
    agencyName,
    agencyLogo,
    agencyPlan,
    agencyStatus,
    agencyHasAIBlogger,
    currentUserCanUseAI,
}: MobileSidebarProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);

    // Close sidebar when route changes
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setOpen(false);
    }, [pathname]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isHydrated) return null; // Avoid hydration mismatch

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="md:hidden p-2 hover:bg-accent rounded-md">
                    <Menu className="h-6 w-6" />
                </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
                <SheetTitle className="hidden">Navigation Menu</SheetTitle>
                <div className="h-full">
                    <Sidebar 
                        currentUserId={currentUserId} 
                        currentUserUsername={currentUserUsername} 
                        currentUserRole={currentUserRole}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                        agencyPlan={agencyPlan}
                        agencyStatus={agencyStatus}
                        agencyHasAIBlogger={agencyHasAIBlogger}
                        currentUserCanUseAI={currentUserCanUseAI}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
