"use client";

import { useState, useEffect } from "react";
import { updateTask, getUsers, getServices, deleteTask } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";

interface EditTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
    permissions?: any; // UserPermissions
    currentUserId?: string;
}

export function EditTaskModal({ task, open, setOpen, permissions, currentUserId }: EditTaskModalProps) {
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
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            Promise.all([getUsers(), getServices()]).then(([u, s]) => {
                setUsers(u);
                setServices(s);
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

    const canEdit = permissions?.canManageTasks ?? true;
    // We don't have currentUserId here easily to check 'own' vs 'any' for delete strictly ON CLIENT?
    // Actually we can infer from permissions.deleteAccess. If 'own', we need to know if it's own.
    // But EditTaskModal doesn't have currentUserId. 
    // Ideally we pass currentUserId or we pass "canDelete" boolean computed by parent.
    // For now, let's assume if deleteAccess is 'any', allowed. If 'own', we check task.createdBy.
    // We need currentUserId. We can fetch it or pass it. 
    // Let's rely on server rejection for strict security, and basic UI hiding.
    // BUT we need to know if we should show the button at all.
    // Let's add currentUserId prop or assume parent handles "canDelete" logic?
    // Parent KanbanBoard has currentUserId. DroppableColumn has it. TaskCard has it.
    // TaskCard passes open/setOpen but doesn't render EditTaskModal directly?
    // No, KanbanBoard renders EditTaskModal. KanbanBoard has currentUserId.
    // So update KanbanBoard to pass currentUserId to EditTaskModal.

    // For now, assuming currentUserId is passed or accessible.
    // Let's add currentUserId to props.

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
                            disabled={!canEdit}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task Name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select
                                disabled={!canEdit}
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                            >
                                <option value="" disabled>Select Category</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign To</label>
                            <select
                                disabled={!canEdit}
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
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
                            disabled={!canEdit}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Task details..."
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                disabled={!canEdit}
                                value={status}
                                onChange={e => setStatus(e.target.value as Task['status'])}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                            >
                                {["Todo", "In Progress", "Review", "Done"].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date & Time</label>
                            <input
                                disabled={!canEdit} // Status change in edit modal also controlled by manage permissions? Or Mark Done? 
                                // Ideally status should be flexible but if they can't manage tasks, they probably shouldn't edit status here either.
                                // If they have 'canMarkDone' but not 'canManageTasks', they should drag to done? 
                                // For simplicity disable all if !canEdit.
                                type="datetime-local"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:filter-[invert(82%)_sepia(38%)_saturate(1324%)_hue-rotate(358deg)_brightness(103%)_contrast(106%)] cursor-pointer disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* Delete Button */}
                        {(!permissions ||
                            permissions.deleteAccess === 'any' ||
                            (permissions.deleteAccess === 'own' && task.createdBy === currentUserId)) && (
                                <button disabled={loading} type="button" onClick={handleDelete} className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-100 text-red-700 h-10 px-4 hover:bg-red-200">
                                    Delete Task
                                </button>
                            )}

                        {/* Save Button - Hide if cannot edit */}
                        {canEdit && (
                            <button disabled={loading} type="submit" className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 hover:bg-indigo-700">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                            </button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    );
}
