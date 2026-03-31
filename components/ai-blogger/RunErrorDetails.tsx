"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorObject {
    message: string;
    code?: string;
    type?: string;
    details?: string;
}

interface RunErrorDetailsProps {
    error: ErrorObject;
}

function classifyErrorType(
    message: string,
    code?: string
): { type: string; color: string } {
    const msg = message.toLowerCase();
    const errorCode = code?.toString().toLowerCase() || "";

    if (msg.includes("rate limit") || errorCode === "429") {
        return { type: "Rate Limit", color: "text-amber-600 dark:text-amber-400" };
    }
    if (msg.includes("503") || msg.includes("service unavailable")) {
        return { type: "Service Unavailable", color: "text-red-600 dark:text-red-400" };
    }
    if (msg.includes("timeout") || errorCode === "408") {
        return { type: "Timeout", color: "text-orange-600 dark:text-orange-400" };
    }
    if (msg.includes("validation") || msg.includes("invalid")) {
        return { type: "Validation Error", color: "text-yellow-600 dark:text-yellow-400" };
    }
    if (msg.includes("authentication") || msg.includes("unauthorized") || errorCode === "401") {
        return { type: "Auth Error", color: "text-purple-600 dark:text-purple-400" };
    }
    if (msg.includes("forbidden") || errorCode === "403") {
        return { type: "Forbidden", color: "text-pink-600 dark:text-pink-400" };
    }
    if (errorCode?.startsWith("5")) {
        return { type: "Server Error", color: "text-red-600 dark:text-red-400" };
    }
    if (errorCode?.startsWith("4")) {
        return { type: "Client Error", color: "text-orange-600 dark:text-orange-400" };
    }

    return { type: "Error", color: "text-slate-600 dark:text-slate-400" };
}

export function RunErrorDetails({ error }: RunErrorDetailsProps) {
    const [copied, setCopied] = useState(false);
    const classification = classifyErrorType(error.message, error.code);

    const errorText = `${classification.type}${error.code ? ` (${error.code})` : ""}\n${error.message}${
        error.details ? `\n\nDetails: ${error.details}` : ""
    }`;

    const handleCopy = () => {
        navigator.clipboard.writeText(errorText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg border border-red-200/50 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/30 px-3 py-3 space-y-2">
            {/* Error Type Badge */}
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className={cn("text-xs font-semibold", classification.color)}>
                        {classification.type}
                        {error.code && ` | Code: ${error.code}`}
                    </div>

                    {/* Error Message */}
                    <p className="text-xs leading-snug text-red-700 dark:text-red-300 break-words">
                        {error.message}
                    </p>

                    {/* Error Details */}
                    {error.details && (
                        <p className="text-xs leading-snug text-red-600 dark:text-red-400 break-words max-h-20 overflow-y-auto">
                            {error.details}
                        </p>
                    )}

                    {/* Error Type from API */}
                    {error.type && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            Type: <span className="font-mono">{error.type}</span>
                        </p>
                    )}
                </div>

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-7 px-2 text-red-700 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                    title="Copy error details"
                >
                    {copied ? (
                        <Check className="w-3 h-3" />
                    ) : (
                        <Copy className="w-3 h-3" />
                    )}
                </Button>
            </div>
        </div>
    );
}
