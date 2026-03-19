"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUsers, getUser, getLeaveRequests, getArchivedUsers, unarchiveUser } from "@/lib/actions";
import { User, LeaveRequest } from "@/lib/types";
import { getSessionId } from "@/lib/auth";
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { Card } from "@/components/ui/card";
import { Plus, Search, Users, Shield, UserCheck, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamPageSkeleton } from "@/components/team/TeamPageSkeleton";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROLE_FILTERS = [
    { key: "all", label: "All", icon: Users },
    { key: "admin", label: "Admin", icon: Shield },
    { key: "manager", label: "Manager", icon: Shield },
    { key: "employee", label: "Employee", icon: UserCheck },
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
    const [showArchived, setShowArchived] = useState(false);
    const { openChat } = useChat();
    const router = useRouter();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const currentId = await getSessionId();
            if (!currentId) {
                router.replace('/login');
                return;
            }

            const currentUser = await getUser(currentId);
            if (!currentUser) {
                router.replace('/login');
                return;
            }

            if (currentUser.role === 'client') {
                router.replace('/dashboard');
                return;
            }

            setCurrentUserRole(currentUser.role);
            setCurrentUserId(currentUser.id);

            const [usersData, requests] = await Promise.all([
                showArchived ? getArchivedUsers() : getUsers(),
                currentUser.role === 'admin' || currentUser.role === 'manager'
                    ? getLeaveRequests()
                    : Promise.resolve([])
            ]);

            setUsers(usersData);
            setLeaveRequests(requests.filter(r => r.status === 'Pending'));
        } catch (e) {
            console.error("Failed to load team page", e);
            toast.error("Failed to load team page");
        } finally {
            setLoading(false);
        }
    }, [router, showArchived]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
    const managerCount = users.filter(u => u.role === 'manager').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;

    const { visibleCount, sentinelRef, hasMore } = useProgressiveList(filteredUsers.length, 12, [searchQuery, roleFilter, showArchived]);

    const handleRestore = async (userId: string, userName: string) => {
        try {
            await unarchiveUser(userId);
            loadData();
        } catch (error) {
            console.error("Failed to restore user", error);
            toast.error(`Failed to restore ${userName}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {showArchived ? "Deactivated Members" : "Team"}
                </h1>
                <div className="flex gap-2">
                    {(currentUserRole === 'admin') && (
                        <Button
                            variant={showArchived ? "default" : "outline"}
                            onClick={() => setShowArchived(!showArchived)}
                            className="w-full sm:w-auto"
                        >
                            {showArchived ? (
                                <>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Show Active
                                </>
                            ) : (
                                <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Show Deactivated
                                </>
                            )}
                        </Button>
                    )}
                    {!showArchived && (currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <button
                            onClick={() => handleOpenDialog()}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Member
                        </button>
                    )}
                </div>
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
                        <div className="p-2 bg-violet-500/10 rounded-lg">
                            <Shield className="h-4 w-4 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{managerCount}</p>
                            <p className="text-xs text-muted-foreground">Managers</p>
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
                                            f.key === "manager" ? managerCount : totalMembers})
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
                <>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredUsers.slice(0, visibleCount).map(user => (
                            <TeamMemberCard
                                key={user.id}
                                user={user}
                                showArchived={showArchived}
                                currentUserId={currentUserId}
                                currentUserRole={currentUserRole}
                                canViewSalary={canViewSalary}
                                onMessage={openChat}
                                onEdit={handleOpenDialog}
                                onRestore={handleRestore}
                            />
                        ))}
                    </div>
                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
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
