"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser, getUser, getLeaveRequests } from "@/lib/actions"; // Added getUser
import { User, LeaveRequest } from "@/lib/types";
import { getSessionId } from "@/lib/auth"; // Added getSessionId
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Plus, Mail, IndianRupee, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditUserDialog } from "@/components/team/EditUserDialog";

export default function TeamPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

    // Form State
    const [editingUser, setEditingUser] = useState<User | null>(null);



    const loadData = async () => {
        const data = await getUsers();
        setUsers(data);

        // Fetch current user role
        try {
            const currentId = await getSessionId();
            if (currentId) {
                const currentUser = await getUser(currentId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);
                    setCurrentUserId(currentUser.id);

                    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                        const requests = await getLeaveRequests();
                        // Filter logic if needed, getLeaveRequests defaults to all if no ID passed (simulating admin view)
                        // But strictly in action we implemented it to return all if no ID arg. 
                        // Let's filter client-side just in case or rely on action.
                        // Strictly status === 'Pending' for Admin Dashboard
                        setLeaveRequests(requests.filter(r => r.status === 'Pending'));
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch current user", e);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenDialog = (user?: any) => {
        setEditingUser(user || null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Team</h1>
                <button
                    onClick={() => handleOpenDialog()}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Member
                </button>
            </div>

            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <LeaveRequestsList requests={leaveRequests} mode="admin" users={users} />
            )}

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {users.map(user => (
                        <Link href={`/dashboard/team/${user.username || user.id}`} key={user.id} className="block h-full">
                            <Card className="group relative overflow-hidden transition-all hover:shadow-lg h-full border-neutral-800 hover:border-yellow-500/50 hover:bg-neutral-900 cursor-pointer">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                    {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserId === user.id) && (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenDialog(user); }} className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80">
                                            <span className="sr-only">Edit</span>
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64584 8.647 3.58564 8.72531 3.53033 8.80868L3.53033 8.80868L2 12.9999L6.19122 11.4696L6.19122 11.4696C6.27463 11.4143 6.35304 11.3541 6.42171 11.2854L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.41421 9.41421L3.99998 12.0001L6.58579 11.5858L10.5 7.67157L8.32843 5.5L4.41421 9.41421ZM11.4142 2.41421L12.5858 3.58579L11.5 4.67157L10.3284 3.5L11.4142 2.41421Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                        </button>
                                    )}
                                </div>

                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-primary/10 transition-transform group-hover:scale-110">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-lg group-hover:text-yellow-500 transition-colors">{user.name}</CardTitle>
                                        {user.username && (
                                            <p className="text-xs text-muted-foreground mb-0.5">@{user.username}</p>
                                        )}
                                        <CardDescription className="capitalize text-primary font-medium">{user.jobTitle || user.role}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Mail className="mr-2 h-4 w-4" />
                                        {user.email}
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Briefcase className="mr-2 h-4 w-4" />
                                        {user.role}
                                    </div>
                                    {user.salary && user.salary > 0 && (
                                        <div className="flex items-center text-sm font-medium text-green-600">
                                            <IndianRupee className="mr-2 h-4 w-4" />
                                            {user.salary.toLocaleString()}/mo
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            <EditUserDialog
                user={editingUser}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={loadData}
                currentUserRole={currentUserRole}
            />
        </div>
    );
}
