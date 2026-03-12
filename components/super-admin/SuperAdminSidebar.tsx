"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    BarChart3,
    CreditCard,
    Settings,
    FileText,
    LogOut,
    X,
    Brain
} from "lucide-react";
import { logout } from "@/lib/auth";

const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "Agencies", href: "/super-admin/agencies", icon: Building2 },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    { name: "AI Usage", href: "/super-admin/analytics/ai", icon: Brain },
    { name: "Billing", href: "/super-admin/billing", icon: CreditCard },
    { name: "System Logs", href: "/super-admin/logs", icon: FileText },
    { name: "Settings", href: "/super-admin/settings", icon: Settings },
];

interface SuperAdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    const handleNavClick = () => {
        // Close sidebar on mobile after navigation
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col
                transform transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0 lg:z-auto
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Super Admin</h1>
                        <p className="text-muted-foreground text-sm mt-1">System Management</p>
                    </div>
                    {/* Close button on mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const matchesPath = item.href === "/super-admin"
                            ? pathname === "/super-admin"
                            : pathname === item.href || pathname?.startsWith(item.href + "/");
                        // Don't highlight parent if a more specific child nav item matches
                        const hasMoreSpecificMatch = matchesPath && navigation.some(
                            other => other.href !== item.href
                                && other.href.startsWith(item.href + "/")
                                && (pathname === other.href || pathname?.startsWith(other.href + "/"))
                        );
                        const isActive = matchesPath && !hasMoreSpecificMatch;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleNavClick}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
