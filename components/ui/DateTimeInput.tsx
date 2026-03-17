"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
    type?: "datetime-local" | "date" | "time";
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    disabled?: boolean;
    min?: string;
    max?: string;
    placeholder?: string;
    required?: boolean;
}

type PickerInput = HTMLInputElement & {
    showPicker?: () => void;
};

/**
 * A theme-aware date/datetime input that shows a visible Lucide
 * Calendar icon regardless of the browser's color-scheme quirks.
 * Clicking the icon programmatically opens the native picker.
 */
export function DateTimeInput({
    type = "datetime-local",
    value,
    onChange,
    className,
    disabled,
    min,
    max,
    required,
}: DateTimeInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = () => {
        const input = inputRef.current as PickerInput | null;
        if (disabled || !input) return;
        try {
            input.showPicker?.();
        } catch {
            input.focus();
        }
    };

    return (
        <div className="relative flex items-center">
            <input
                ref={inputRef}
                type={type}
                value={value}
                onChange={onChange}
                disabled={disabled}
                min={min}
                max={max}
                required={required}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "cursor-pointer",
                    /* Hide the browser's native calendar icon — we show our own */
                    "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                    className
                )}
            />
            {/* Visible themed calendar icon */}
            <button
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onClick={handleIconClick}
                className="absolute right-0 h-10 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors pointer-events-auto disabled:opacity-50"
            >
                <Calendar className="w-4 h-4" />
            </button>
        </div>
    );
}
