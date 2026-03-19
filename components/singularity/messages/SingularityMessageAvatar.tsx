"use client";

import { Bot, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/utils";

type SingularityMessageAvatarProps = {
    role: "user" | "model";
    isAgent: boolean;
};

export function SingularityMessageAvatar({
    role,
    isAgent,
}: SingularityMessageAvatarProps) {
    return (
        <div
            className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 transition-all duration-300",
                role === "user"
                    ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700",
            )}
        >
            {role === "user" ? (
                <User className="w-4 h-4" />
            ) : isAgent ? (
                <Bot className="w-4 h-4" />
            ) : (
                <Sparkles className="w-4 h-4" />
            )}
        </div>
    );
}
