"use client";

import { useState, useEffect } from "react";
import { createTask, getServices, getUsers, enhanceTaskDescription } from "@/lib/actions";
import { AIChatBox } from "./AIChatBox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Sparkles, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateTaskModalProps {
    projectId: string;
    assigneeId?: string;
}

export function CreateTaskModal({ projectId, assigneeId: defaultAssignee = "" }: CreateTaskModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("u1"); // Mock user ID for now, ideally passed via props or context

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [startDate, setStartDate] = useState("");
    const [assigneeId, setAssigneeId] = useState(defaultAssignee);
    const [category, setCategory] = useState("");

    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            Promise.all([getUsers(), getServices()]).then(([u, s]) => {
                setUsers(u);
                setServices(s);
                if (s.length > 0 && !category) setCategory(s[0].name);
                if (u.length > 0 && !assigneeId) setAssigneeId(u[0].id);
            });
        }
    }, [open]);

    const handleEnhance = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowChat(!showChat);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await createTask({
            projectId,
            title,
            description,
            status: "Todo",
            assigneeId,
            category,
            dueDate: dueDate || new Date().toISOString()
        });
        setLoading(false);
        setOpen(false);
        // Reset form
        setTitle("");
        setDescription("");
        setDueDate("");
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                </button>
            </DialogTrigger>
            <DialogContent className={`transition-all duration-300 ${showChat ? "sm:max-w-[900px]" : "sm:max-w-[500px]"}`}>
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="flex gap-6 h-[600px]">
                    {/* Left Side: Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
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
                                    {services.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
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
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Description</label>
                                <button
                                    onClick={handleEnhance}
                                    type="button" // Prevent form submit
                                    disabled={!title}
                                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md transition-all font-medium border ${showChat
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200"
                                        : "text-muted-foreground border-transparent hover:bg-muted"
                                        }`}
                                >
                                    <Sparkles className={`h-3 w-3 ${showChat ? "fill-indigo-300" : ""}`} />
                                    {showChat ? "Close Assistant" : "AI Assistant"}
                                </button>
                            </div>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Task details..."
                                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date & Time</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:filter-[invert(82%)_sepia(38%)_saturate(1324%)_hue-rotate(358deg)_brightness(103%)_contrast(106%)] cursor-pointer"
                            />
                        </div>

                        <button disabled={loading} type="submit" className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white h-10 px-4 hover:bg-indigo-700 mt-4">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                        </button>
                    </form>

                    {/* Right Side: AI Chat */}
                    {showChat && (
                        <div className="w-[400px] border-l border-border pl-6 relative animate-in slide-in-from-right duration-300 fade-in">
                            <AIChatBox
                                projectId={projectId}
                                taskState={{ title, description }}
                                userId={currentUserId}
                                onClose={() => setShowChat(false)}
                                onApply={(text) => setDescription(text)}
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
