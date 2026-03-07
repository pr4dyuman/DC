"use client";

import { useState, useEffect } from "react";
import { updateTask, getUsers, getServices, deleteTask, aiEstimateTaskHours } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { toast } from "sonner";
import { DateTimeInput } from "@/components/ui/DateTimeInput";

interface EditTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
    permissions?: any;
    currentUserId?: string;
}

const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

export function EditTaskModal({ task, open, setOpen, permissions, currentUserId }: EditTaskModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [estimating, setEstimating] = useState(false);

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [dueDate, setDueDate] = useState(task.dueDate || "");
    const [status, setStatus] = useState(task.status);
    const [assigneeId, setAssigneeId] = useState(task.assigneeId);
    const [category, setCategory] = useState(task.category || "");
    const [priority, setPriority] = useState<Task['priority']>(task.priority || "Medium");
    const [estimatedHours, setEstimatedHours] = useState<number>(task.estimatedHours || 0);

    const [users, setUsers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            // Reset confirm delete state when reopened
            setConfirmDelete(false);
            Promise.all([getUsers(), getServices()]).then(([u, s]) => {
                setUsers(u);
                setServices(s);
            });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTask(task.id, {
                title,
                description,
                status: status as Task['status'],
                assigneeId,
                category,
                priority,
                dueDate: dueDate || undefined,
                estimatedHours: estimatedHours || undefined,
            });
            toast.success("Task updated successfully");
            setOpen(false);
            router.refresh();
        } catch {
            toast.error("Failed to update task");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteTask(task.id);
            toast.success("Task deleted");
            setOpen(false);
            router.refresh();
        } catch {
            toast.error("Failed to delete task");
        } finally {
            setLoading(false);
        }
    };

    const canEdit = permissions?.canManageTasks ?? true;
    const canDelete = !permissions ||
        permissions.deleteAccess === 'any' ||
        (permissions.deleteAccess === 'own' && task.createdBy === currentUserId);

    const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring";
    const labelCls = "text-sm font-medium text-foreground";

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmDelete(false); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Task Title</label>
                        <input
                            required
                            disabled={!canEdit}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task title"
                            className={inputCls}
                        />
                    </div>

                    {/* Category + Assignee */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Category</label>
                            <select disabled={!canEdit} value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                                <option value="">No Category</option>
                                {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Assign To</label>
                            <select disabled={!canEdit} value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={inputCls}>
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Priority + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Priority</label>
                            <select disabled={!canEdit} value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className={inputCls}>
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Status</label>
                            <select disabled={!canEdit} value={status} onChange={e => setStatus(e.target.value as Task['status'])} className={inputCls}>
                                {["Todo", "In Progress", "Review", "Done"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Estimated Hours */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Estimated Hours</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={estimatedHours || ""}
                                    onChange={e => setEstimatedHours(parseFloat(e.target.value) || 0)}
                                    placeholder="e.g. 4"
                                    className={`${inputCls} w-28 pr-9`}
                                />
                                <button
                                    type="button"
                                    disabled={!title.trim() || estimating}
                                    title="AI Estimate"
                                    onClick={async () => {
                                        setEstimating(true);
                                        try {
                                            const hours = await aiEstimateTaskHours(task.projectId, title, description, priority || 'Medium');
                                            setEstimatedHours(hours);
                                            toast.success(`Estimated: ${hours}h`);
                                        } catch (e: any) {
                                            toast.error(e.message || 'Failed to estimate');
                                        } finally {
                                            setEstimating(false);
                                        }
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md transition-all text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {estimating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                            <span className="text-xs text-muted-foreground">hours</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Description</label>
                        <textarea
                            disabled={!canEdit}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Task details..."
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Due Date &amp; Time <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <DateTimeInput
                            type="datetime-local"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            disabled={!canEdit}
                        />
                    </div>

                    {/* Delete confirmation inline */}
                    {canDelete && confirmDelete && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="text-sm text-red-600 dark:text-red-400 flex-1">Delete this task permanently?</span>
                            <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded">Cancel</button>
                            <button type="button" disabled={loading} onClick={handleDelete} className="text-xs font-semibold bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center gap-1">
                                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        {canDelete && !confirmDelete && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setConfirmDelete(true)}
                                className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium bg-red-500/10 text-red-600 dark:text-red-400 h-10 px-3 hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" /> Delete
                            </button>
                        )}
                        {canEdit && (
                            <button
                                disabled={loading}
                                type="submit"
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 hover:bg-primary/90 transition-colors"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                            </button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
