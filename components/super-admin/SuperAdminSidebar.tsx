"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Building2, 
    BarChart3, 
    CreditCard, 
    Settings, 
    FileText,
    LogOut
} from "lucide-react";
import { logout } from "@/lib/auth";

const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "Agencies", href: "/super-admin/agencies", icon: Building2 },
    { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    { name: "Billing", href: "/super-admin/billing", icon: CreditCard },
    { name: "System Logs", href: "/super-admin/logs", icon: FileText },
    { name: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    
    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };
    
    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold">Super Admin</h1>
                <p className="text-gray-400 text-sm mt-1">System Management</p>
            </div>
            
            <nav className="flex-1 px-3 space-y-1">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                isActive
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
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
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
