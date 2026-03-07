"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser, getUser, getLeaveRequests } from "@/lib/actions";
import { User, LeaveRequest } from "@/lib/types";
import { getSessionId } from "@/lib/auth";
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Mail, IndianRupee, Briefcase, Search, Users, Shield, UserCheck, MessageCircle, Phone } from "lucide-react";
import { TeamPageSkeleton } from "@/components/team/TeamPageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_FILTERS = [
    { key: "all", label: "All", icon: Users },
    { key: "admin", label: "Admin", icon: Shield },
    { key: "manager", label: "Manager", icon: Shield },
    { key: "employee", label: "Employee", icon: UserCheck },
    { key: "client", label: "Client", icon: Briefcase },
] as const;



export default function TeamPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const { openChat } = useChat();

    const loadData = async () => {
        const [usersData, currentId] = await Promise.all([
            getUsers(),
            getSessionId()
        ]);

        setUsers(usersData);

        if (currentId) {
            try {
                const currentUser = await getUser(currentId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);
                    setCurrentUserId(currentUser.id);

                    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                        const requests = await getLeaveRequests();
                        setLeaveRequests(requests.filter(r => r.status === 'Pending'));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch current user", e);
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenDialog = (user?: User) => {
        setEditingUser(user || null);
        setIsDialogOpen(true);
    };

    const canViewSalary = currentUserRole === 'admin' || currentUserRole === 'manager';

    const filteredUsers = users.filter(u => {
        const matchesSearch = searchQuery.trim()
            ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Stats
    const totalMembers = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const employeeCount = users.filter(u => u.role === 'employee' || u.role === 'manager').length;
    const clientCount = users.filter(u => u.role === 'client').length;

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

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-card border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                            <p className="text-xs text-muted-foreground">Total Members</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-card border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Shield className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{adminCount}</p>
                            <p className="text-xs text-muted-foreground">Admins</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-card border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <UserCheck className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{employeeCount}</p>
                            <p className="text-xs text-muted-foreground">Employees</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-card border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Briefcase className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{clientCount}</p>
                            <p className="text-xs text-muted-foreground">Clients</p>
                        </div>
                    </div>
                </Card>
            </div>

            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <LeaveRequestsList requests={leaveRequests} mode="admin" users={users} />
            )}

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, email, username, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {ROLE_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setRoleFilter(f.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 border",
                                roleFilter === f.key
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <f.icon className="w-3 h-3" />
                            {f.label}
                            {f.key !== "all" && (
                                <span className="opacity-70">
                                    ({f.key === "admin" ? adminCount :
                                        f.key === "employee" ? employeeCount :
                                            f.key === "manager" ? users.filter(u => u.role === 'manager').length :
                                                f.key === "client" ? clientCount : totalMembers})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            {loading ? (
                <TeamPageSkeleton />
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    {searchQuery || roleFilter !== "all" ? (
                        <>
                            <p className="font-medium text-foreground">No matching members found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter.</p>
                        </>
                    ) : (
                        <>
                            <p className="font-medium text-foreground">No team members yet</p>
                            <p className="text-sm mt-1">Click &quot;Add Member&quot; to get started.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredUsers.map(user => (
                        <Link href={`/dashboard/team/${user.username || user.id}`} key={user.id} className="block h-full">
                            <Card className="group relative overflow-hidden transition-all hover:shadow-lg h-full border-border hover:border-primary/50 hover:bg-muted cursor-pointer">
                                {/* Quick Actions (hover) */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                    {user.id !== currentUserId && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openChat(user.id); }}
                                            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition shadow-sm"
                                            title="Send Message"
                                        >
                                            <MessageCircle className="h-3 w-3" />
                                        </button>
                                    )}
                                    {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserId === user.id) && (
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenDialog(user); }} className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition shadow-sm">
                                            <span className="sr-only">Edit</span>
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64584 8.647 3.58564 8.72531 3.53033 8.80868L3.53033 8.80868L2 12.9999L6.19122 11.4696L6.19122 11.4696C6.27463 11.4143 6.35304 11.3541 6.42171 11.2854L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.41421 9.41421L3.99998 12.0001L6.58579 11.5858L10.5 7.67157L8.32843 5.5L4.41421 9.41421ZM11.4142 2.41421L12.5858 3.58579L11.5 4.67157L10.3284 3.5L11.4142 2.41421Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                        </button>
                                    )}
                                </div>

                                {/* Role Badge */}
                                <div className="absolute top-3 left-3 z-10">
                                    <Badge variant="secondary" className="text-[10px] capitalize bg-muted/80 backdrop-blur-sm border border-border">
                                        {user.role}
                                    </Badge>
                                </div>

                                <CardHeader className="flex flex-row items-center gap-4 pt-10">
                                    <div className="relative">
                                        <Avatar className="h-14 w-14 border-2 border-primary/10 transition-transform group-hover:scale-110">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{user.name}</CardTitle>
                                        {user.username && (
                                            <p className="text-xs text-muted-foreground mb-0.5">@{user.username}</p>
                                        )}
                                        <CardDescription className="capitalize text-primary font-medium">{user.jobTitle || user.role}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Mail className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    {user.contactNumber && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Phone className="mr-2 h-4 w-4 shrink-0" />
                                            <span>{user.contactNumber}</span>
                                        </div>
                                    )}
                                    {canViewSalary && user.salary && user.salary > 0 && (
                                        <div className="flex items-center text-sm font-medium text-green-500">
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
