"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { explainTask } from "@/lib/actions"; // Server Action
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIExplanationModalProps {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId?: string;
}

export function AIExplanationModal({ taskId, open, onOpenChange, userId }: AIExplanationModalProps) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && taskId && !explanation) {
            handleExplain();
        }
    }, [open, taskId]);

    const handleExplain = async () => {
        if (!taskId) return;
        setLoading(true);
        setError(null);
        try {
            // Pass userId to server action if available
            const result = await explainTask(taskId, userId || "");
            setExplanation(result);
        } catch (err) {
            console.error(err);
            setError("Failed to generate explanation. Please check your API key and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Task Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Get a clear summary and next steps for this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Analyzing task context...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500 space-y-3">
                            <p>{error}</p>
                            <Button onClick={handleExplain} variant="outline" size="sm">
                                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                            </Button>
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-secondary">
                            <div className="prose dark:prose-invert text-sm max-w-none">
                                <ReactMarkdown>{explanation || ""}</ReactMarkdown>
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {!loading && !error && (
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                        <Button variant="outline" onClick={handleExplain}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
