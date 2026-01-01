"use client";

import { useState, useEffect } from "react";
import { login, getSessionId, getUser, getUsers, getClients } from "@/lib/actions";
import { User, Client } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { UserCheck, Shield, ShieldAlert, Briefcase, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        Promise.all([getUsers(), getClients()]).then(([userData, clientData]) => {
            setUsers(userData);
            setClients(clientData);
            setLoading(false);
        });
    }, []);

    const handleLogin = (userId: string) => {
        // Set cookie for 7 days
        Cookies.set("userId", userId, { expires: 7 });
        router.push("/dashboard");
        router.refresh();
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <ShieldAlert className="w-5 h-5 text-red-500" />;
            case 'manager': return <Shield className="w-5 h-5 text-blue-500" />;
            case 'specialist': return <UserCheck className="w-5 h-5 text-purple-500" />;
            default: return <Briefcase className="w-5 h-5 text-emerald-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">AgencyOS Login</h1>
                <p className="text-slate-400">Select a profile to simulate a session</p>
            </div>

            {loading ? (
                <div className="text-white animate-pulse">Loading profiles...</div>
            ) : (
                <Tabs defaultValue="team" className="w-full max-w-4xl">
                    <div className="flex justify-center mb-6">
                        <TabsList className="bg-slate-900 border border-slate-800 text-slate-400">
                            <TabsTrigger value="team" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">Team Members</TabsTrigger>
                            <TabsTrigger value="clients" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">Clients</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="team">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map((user) => (
                                <Card
                                    key={user.id}
                                    className="bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
                                    onClick={() => handleLogin(user.id)}
                                >
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-amber-500 transition-colors">
                                            <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-white text-lg">{user.name}</CardTitle>
                                                {getRoleIcon(user.role)}
                                            </div>
                                            <CardDescription className="text-slate-400 capitalize flex items-center gap-1">
                                                {user.role}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-slate-500 font-mono bg-slate-950 p-2 rounded truncate">
                                            ID: {user.id}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="clients">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clients.map((client) => (
                                <Card
                                    key={client.id}
                                    className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer group"
                                    onClick={() => handleLogin(client.id)}
                                >
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-indigo-500 transition-colors">
                                            {client.logo ? (
                                                <img src={client.logo} alt={client.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-indigo-900/20 text-indigo-400 font-bold text-xl">
                                                    {client.companyName?.substring(0, 2).toUpperCase() || "CL"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-white text-lg">{client.companyName}</CardTitle>
                                                <Building2 className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <CardDescription className="text-slate-400 capitalize flex items-center gap-1">
                                                {client.name}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-slate-500 font-mono bg-slate-950 p-2 rounded truncate">
                                            ID: {client.id}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            <div className="mt-8 text-slate-500 text-sm">
                Warning: This is a strict development mode authentication system.
            </div>
        </div>
    );
}
