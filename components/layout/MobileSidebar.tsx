"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface MobileSidebarProps {
    currentUserId?: string;
    currentUserUsername?: string;
    currentUserRole?: string;
    agencyName?: string;
    agencyLogo?: string;
    agencyPlan?: string;
}

export function MobileSidebar({ currentUserId, currentUserUsername, currentUserRole, agencyName, agencyLogo, agencyPlan }: MobileSidebarProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close sidebar when route changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    if (!mounted) return null; // Avoid hydration mismatch

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
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
