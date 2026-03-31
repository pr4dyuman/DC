"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface AIBloggerBreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function AIBloggerBreadcrumb({ items, className }: AIBloggerBreadcrumbProps) {
    return (
        <nav className={cn("flex items-center gap-1 text-sm", className)}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <div key={index} className="flex items-center gap-1">
                        {index > 0 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {item.href && !isLast ? (
                            <Link
                                href={item.href}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                className={cn(
                                    isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
