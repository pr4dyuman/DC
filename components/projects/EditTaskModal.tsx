"use client";

import { useState, useEffect } from "react";
import { updateTask, getUsers, getCategories, deleteTask } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/db";

interface EditTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function EditTaskModal({ task, open, setOpen }: EditTaskModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [dueDate, setDueDate] = useState(task.dueDate);
    const [status, setStatus] = useState(task.status);
    const [assigneeId, setAssigneeId] = useState(task.assigneeId);
    const [category, setCategory] = useState(task.category || "");

    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            Promise.all([getUsers(), getCategories()]).then(([u, c]) => {
                setUsers(u);
                setCategories(c);
            });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await updateTask(task.id, {
            title,
            description,
            status: status as Task['status'],
            assigneeId,
            category,
            dueDate
        });
        setLoading(false);
        setOpen(false);
        router.refresh();
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this task?")) {
            setLoading(true);
            await deleteTask(task.id);
            setLoading(false);
            setOpen(false);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title</label>
                        <input
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task Name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="" disabled>Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign To</label>
                            <select
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="" disabled>Select Employee</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.jobTitle || u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Task details..."
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as Task['status'])}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {["Todo", "In Progress", "Review", "Done"].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date & Time</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button disabled={loading} type="button" onClick={handleDelete} className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-100 text-red-700 h-10 px-4 hover:bg-red-200">
                            Delete Task
                        </button>
                        <button disabled={loading} type="submit" className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 hover:bg-indigo-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
