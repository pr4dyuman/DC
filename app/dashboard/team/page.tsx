"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/actions";
import { User } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, MoreVertical, Mail, DollarSign, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TeamPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Omit<User, "id">>({
        name: "",
        email: "",
        role: "employee",
        jobTitle: "",
        salary: 0,
        avatar: "",
        password: ""
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleOpenDialog = (user?: any) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle || "",
                salary: user.salary || 0,
                avatar: user.avatar || "",
                password: "" // Don't show existing hash/password
            });
        } else {
            setEditingUser(null);
            setFormData({ name: "", email: "", role: "employee", jobTitle: "", salary: 0, avatar: "", password: "" });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        if (editingUser) {
            await updateUser(editingUser.id, formData);
        } else {
            await createUser(formData as any);
        }
        setSubmitting(false);
        setIsDialogOpen(false);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this team member?")) {
            await deleteUser(id);
            loadData();
        }
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

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {users.map(user => (
                        <Card key={user.id} className="group relative overflow-hidden transition-all hover:shadow-lg">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => handleOpenDialog(user)} className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80">
                                    <span className="sr-only">Edit</span>
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64584 8.647 3.58564 8.72531 3.53033 8.80868L3.53033 8.80868L2 12.9999L6.19122 11.4696L6.19122 11.4696C6.27463 11.4143 6.35304 11.3541 6.42171 11.2854L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.41421 9.41421L3.99998 12.0001L6.58579 11.5858L10.5 7.67157L8.32843 5.5L4.41421 9.41421ZM11.4142 2.41421L12.5858 3.58579L11.5 4.67157L10.3284 3.5L11.4142 2.41421Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                </button>
                                <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                                    <span className="sr-only">Delete</span>
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3"><path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                </button>
                            </div>

                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="h-14 w-14 border-2 border-primary/10">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">{user.name}</CardTitle>
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
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        ${user.salary.toLocaleString()}/yr
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="specialist">Specialist</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Job Title</label>
                                <input value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} placeholder="e.g. Senior Designer"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Salary (Yearly)</label>
                                <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Profile Picture</label>
                                <div className="flex items-center gap-4">
                                    {formData.avatar && (
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={formData.avatar} />
                                            <AvatarFallback>IMG</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData({ ...formData, avatar: reader.result as string });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Upload an image (auto-converted to base64).</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <input
                                type="password"
                                placeholder={editingUser ? "Leave blank to keep current password" : "Create password"}
                                value={formData.password || ""}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <button disabled={submitting} type="submit" className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 hover:bg-indigo-700">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingUser ? "Save Changes" : "Add Member")}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
