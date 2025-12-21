"use client";

import { useState, useEffect } from 'react';
import { User, UserPermissions } from '@/lib/db';
import { getUsers, getUserPermissions, updateUserPermissions, getClients, Client } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons (Lucide) ---
// Simulating imports if not available, but assuming lucide-react is installed
import { Search, User as UserIcon, Building2, Check, X, Shield, ShieldAlert, Trash2 } from 'lucide-react';

export default function PermissionSettings() {
    const [users, setUsers] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [permissionsMap, setPermissionsMap] = useState<Record<string, UserPermissions>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'employees' | 'clients'>('employees');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, clientsData] = await Promise.all([getUsers(), getClients()]);
            // Filter out admins/managers from employees list as they have full access usually? 
            // Or allow restricting managers too? Let's show non-admins for safety.
            const employees = usersData.filter(u => u.role !== 'admin');
            setUsers(employees);
            setClients(clientsData);

            // Fetch permissions for all
            const allIds = [...employees.map(u => u.id), ...clientsData.map(c => c.id)];
            const perms: Record<string, UserPermissions> = {};
            for (const id of allIds) {
                perms[id] = await getUserPermissions(id);
            }
            setPermissionsMap(perms);
        } catch (error) {
            console.error("Failed to load permission data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePermission = async (userId: string, key: keyof UserPermissions, value: any) => {
        const currentPerms = permissionsMap[userId] || { canManageTasks: true, canMarkDone: true, deleteAccess: 'any' };
        const newPerms = { ...currentPerms, [key]: value };

        // Optimistic UI
        setPermissionsMap(prev => ({ ...prev, [userId]: newPerms }));

        try {
            await updateUserPermissions(userId, newPerms);
        } catch (error) {
            console.error("Failed to update permissions", error);
            // Revert on error
            setPermissionsMap(prev => ({ ...prev, [userId]: currentPerms }));
        }
    };

    const filteredList = activeTab === 'employees'
        ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
        : clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading permissions...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-yellow-500" />
                        Permission Management
                    </h2>
                    <p className="text-gray-400 text-sm">Control access levels for employees and clients.</p>
                </div>

                {/* Search & Desktop Tab Toggle */}
                <div className="flex items-center gap-4 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none text-sm text-white pl-9 pr-4 py-2 focus:ring-0 w-48 md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'employees' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Employees
                    </div>
                    {activeTab === 'employees' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'clients' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Clients
                    </div>
                    {activeTab === 'clients' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />}
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                <AnimatePresence>
                    {filteredList.map((user) => {
                        const perms = permissionsMap[user.id] || { canManageTasks: true, canMarkDone: true, deleteAccess: 'any' };

                        return (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-yellow-500/20 transition-all group"
                            >
                                {/* User Info */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-yellow-500/50 transition-colors">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">{user.name}</h3>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col md:flex-row gap-6 md:gap-12 w-full md:w-auto">

                                    {/* Permission: Manage Tasks */}
                                    <div className="flex items-center justify-between gap-4 min-w-[200px]">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-300 font-medium">Task Management</span>
                                            <span className="text-[10px] text-gray-500">Create, edit, move pending tasks</span>
                                        </div>
                                        <Toggle
                                            enabled={perms.canManageTasks}
                                            onChange={(val) => handleUpdatePermission(user.id, 'canManageTasks', val)}
                                        />
                                    </div>

                                    {/* Permission: Mark Done */}
                                    <div className="flex items-center justify-between gap-4 min-w-[200px]">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-300 font-medium">Completion Rights</span>
                                            <span className="text-[10px] text-gray-500">Move tasks to &quot;Done&quot;</span>
                                        </div>
                                        <Toggle
                                            enabled={perms.canMarkDone}
                                            onChange={(val) => handleUpdatePermission(user.id, 'canMarkDone', val)}
                                        />
                                    </div>

                                    {/* Permission: Delete Access */}
                                    <div className="flex items-center justify-between gap-4 min-w-[200px]">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Trash2 className="w-3 h-3 text-red-400/70" />
                                                <span className="text-sm text-gray-300 font-medium">Delete Access</span>
                                            </div>
                                            <span className="text-[10px] text-gray-500">
                                                {perms.deleteAccess === 'none' ? 'Cannot delete' :
                                                    perms.deleteAccess === 'own' ? 'Own tasks only' : 'Can delete any'}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={perms.deleteAccess}
                                                onChange={(e) => handleUpdatePermission(user.id, 'deleteAccess', e.target.value)}
                                                className="bg-black/40 border border-white/10 text-xs text-gray-300 rounded-lg py-1.5 pl-2 pr-6 focus:ring-1 focus:ring-yellow-500/50 outline-none appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                                            >
                                                <option value="none">None</option>
                                                <option value="own">Own Only</option>
                                                <option value="any">Any Task</option>
                                            </select>
                                            {/* Custom Arrow */}
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredList.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No users found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 ${enabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
    );
}
