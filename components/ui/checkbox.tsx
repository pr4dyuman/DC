"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checked, indeterminate, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
      if (onCheckedChange && !indeterminate) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <label className={cn(
        "relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked || indeterminate ? "bg-primary text-primary-foreground" : "border-muted-foreground/50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}>
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked || false}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        {(checked || indeterminate) && (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {indeterminate ? (
              <line x1="5" y1="12" x2="19" y2="12" />
            ) : (
              <>
                <polyline points="20 6 9 17 4 12" />
              </>
            )}
          </svg>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
