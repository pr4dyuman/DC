"use client";

import { useState, useEffect } from "react";
import { createTask, getServices, getUsers, getCurrentUser, aiEstimateTaskHours } from "@/lib/actions";
import type { ExtractedTaskFields } from "@/lib/actions";
import { AIChatBox } from "./AIChatBox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Sparkles, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { toast } from "sonner";
import { DateTimeInput } from "@/components/ui/DateTimeInput";

type TaskPriority = 'Low' | 'Medium' | 'High';

interface CreateTaskModalProps {
    projectId: string;
    assigneeId?: string;
}

const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];

export function CreateTaskModal({ projectId, assigneeId: defaultAssignee = "" }: CreateTaskModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assigneeId, setAssigneeId] = useState(defaultAssignee);
    const [category, setCategory] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("Medium");
    const [estimatedHours, setEstimatedHours] = useState<number>(0);

    const [users, setUsers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            Promise.all([getUsers(), getServices(), getCurrentUser()]).then(([u, s, currentUser]) => {
                setUsers(u);
                setServices(s);
                if (currentUser) setCurrentUserId(currentUser.id);
                // Set defaults only if not already set
                if (s.length > 0 && !category) setCategory(s[0].name);
                if (u.length > 0 && !assigneeId) setAssigneeId(u[0].id);
            });
        }
    }, [open]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDueDate("");
        setCategory("");
        setPriority("Medium");
        setEstimatedHours(0);
        setShowChat(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createTask({
                projectId,
                title,
                description,
                status: "Todo",
                assigneeId,
                category,
                priority,
                dueDate: dueDate || "",
                estimatedHours: estimatedHours || undefined,
            });
            toast.success("Task created");
            setOpen(false);
            resetForm();
            router.refresh();
        } catch {
            toast.error("Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
    const labelCls = "text-sm font-medium text-foreground";

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-border bg-background text-foreground hover:bg-accent h-9 px-4 py-2 transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                </button>
            </DialogTrigger>
            <DialogContent className={`transition-all duration-300 w-full max-w-[95vw] ${showChat ? "lg:max-w-[900px] sm:max-w-[500px]" : "sm:max-w-[520px]"}`}>
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="relative flex flex-col lg:flex-row h-[85vh] sm:h-[580px] lg:gap-6 overflow-hidden">
                    {/* Left Side: Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto px-1 no-scrollbar">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className={labelCls}>Task Title</label>
                            <input
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Task name"
                                className={inputCls}
                            />
                        </div>

                        {/* Category + Assignee */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                                    <option value="">No Category</option>
                                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Assign To</label>
                                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={inputCls}>
                                    <option value="">Unassigned</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className={labelCls}>Priority</label>
                            <div className="flex gap-2">
                                {PRIORITY_OPTIONS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 h-9 rounded-md border text-xs font-semibold transition-all ${priority === p
                                            ? p === 'High' ? 'bg-red-500/15 border-red-500/50 text-red-500'
                                                : p === 'Medium' ? 'bg-amber-500/15 border-amber-500/50 text-amber-600'
                                                    : 'bg-blue-500/15 border-blue-500/50 text-blue-500'
                                            : 'border-input bg-background text-muted-foreground hover:bg-muted'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
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
                                                const hours = await aiEstimateTaskHours(projectId, title, description, priority);
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
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>Description</label>
                                <button
                                    onClick={() => setShowChat(!showChat)}
                                    type="button"
                                    disabled={!title}
                                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md transition-all font-medium border ${showChat
                                        ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 ring-1 ring-indigo-200"
                                        : "text-muted-foreground border-transparent hover:bg-muted"
                                        }`}
                                >
                                    <Sparkles className={`h-3 w-3 ${showChat ? "fill-indigo-400" : ""}`} />
                                    {showChat ? "Close Assistant" : "AI Assistant"}
                                </button>
                            </div>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Task details, acceptance criteria..."
                                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelCls}>Due Date &amp; Time <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <DateTimeInput
                                type="datetime-local"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 hover:bg-primary/90 transition-colors mt-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                        </button>
                    </form>

                    {/* Right Side: AI Chat */}
                    {showChat && (
                        <AIChatBox
                            projectId={projectId}
                            taskState={{ title, description }}
                            userId={currentUserId}
                            availableCategories={services.map(s => s.name)}
                            onClose={() => setShowChat(false)}
                            onApply={(fields: ExtractedTaskFields) => {
                                if (fields.title) setTitle(fields.title);
                                if (fields.description) setDescription(fields.description);
                                if (fields.category && services.some(s => s.name === fields.category)) {
                                    setCategory(fields.category);
                                }
                                if (fields.priority) setPriority(fields.priority);
                                if (fields.estimatedHours) setEstimatedHours(fields.estimatedHours);
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
