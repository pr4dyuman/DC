"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestLeave } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LeaveRequestDialog({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const type = formData.get("type") as "Casual" | "Emergency";
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const reason = formData.get("reason") as string;

        if (endDate < startDate) {
            setError('End date must be on or after start date');
            setLoading(false);
            return;
        }

        try {
            await requestLeave({
                userId,
                type,
                startDate,
                endDate,
                reason
            });
            setOpen(false);
            router.refresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to submit leave request. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Request Leave</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
                <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 mt-4">
                    {error && (
                        <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Leave Type</Label>
                        <select
                            name="type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        >
                            <option value="Casual">Casual (2 Days Notice)</option>
                            <option value="Emergency">Emergency</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From</Label>
                            <Input name="startDate" type="date" required className="bg-background border-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>To</Label>
                            <Input name="endDate" type="date" required className="bg-background border-input" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea name="reason" placeholder="Why are you taking leave?" required className="bg-background border-input" />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
