"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TotalBalanceProps {
    amount: number;
}

export function TotalBalance({ amount }: TotalBalanceProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="flex items-center justify-end space-x-2 mt-2">
            <span className="text-sm text-muted-foreground mr-1">Total Balance:</span>
            <div className="flex items-center space-x-2">
                <span className={`font-bold text-lg ${isVisible ? "text-foreground" : "text-muted-foreground blur-sm"}`}>
                    {isVisible ? amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : "₹ ••••••"}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsVisible(!isVisible)}
                >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
