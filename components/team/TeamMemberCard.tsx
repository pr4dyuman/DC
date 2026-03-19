"use client";

import Link from "next/link";
import { ArchiveRestore, Banknote, Mail, MessageCircle, Phone } from "lucide-react";
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TeamMemberCardProps = {
    user: User;
    showArchived: boolean;
    currentUserId: string;
    currentUserRole: string;
    canViewSalary: boolean;
    onMessage: (userId: string) => void;
    onEdit: (user: User) => void;
    onRestore: (userId: string, userName: string) => void;
};

export function TeamMemberCard({
    user,
    showArchived,
    currentUserId,
    currentUserRole,
    canViewSalary,
    onMessage,
    onEdit,
    onRestore,
}: TeamMemberCardProps) {
    return (
        <Link href={`/dashboard/team/${user.username || user.id}`} className="block h-full">
            <Card
                className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-lg h-full border-border hover:border-primary/50 hover:bg-muted cursor-pointer",
                    showArchived && "opacity-70",
                )}
            >
                {!showArchived && (
                    <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        {user.id !== currentUserId && (
                            <button
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onMessage(user.id);
                                }}
                                className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition shadow-sm"
                                aria-label={`Message ${user.name}`}
                                title="Send Message"
                            >
                                <MessageCircle className="h-3 w-3" />
                            </button>
                        )}
                        {(currentUserRole === "admin" || currentUserRole === "manager" || currentUserId === user.id) && (
                            <button
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onEdit(user);
                                }}
                                className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition shadow-sm"
                                aria-label={`Edit ${user.name}`}
                                title="Edit profile"
                            >
                                <span className="sr-only">Edit</span>
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 15 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                >
                                    <path
                                        d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64584 8.647 3.58564 8.72531 3.53033 8.80868L3.53033 8.80868L2 12.9999L6.19122 11.4696L6.19122 11.4696C6.27463 11.4143 6.35304 11.3541 6.42171 11.2854L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.41421 9.41421L3.99998 12.0001L6.58579 11.5858L10.5 7.67157L8.32843 5.5L4.41421 9.41421ZM11.4142 2.41421L12.5858 3.58579L11.5 4.67157L10.3284 3.5L11.4142 2.41421Z"
                                        fill="currentColor"
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="absolute top-3 left-3 z-10 flex gap-1">
                    <Badge variant="secondary" className="text-[10px] capitalize bg-muted/80 backdrop-blur-sm border border-border">
                        {user.role}
                    </Badge>
                    {showArchived && (
                        <Badge variant="destructive" className="text-[10px] bg-red-500/80 backdrop-blur-sm">
                            Deactivated
                        </Badge>
                    )}
                </div>

                {showArchived && currentUserRole === "admin" && (
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onRestore(user.id, user.name);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition shadow-sm flex items-center gap-1"
                            title="Reactivate this account"
                        >
                            <ArchiveRestore className="h-3 w-3" />
                            Restore
                        </button>
                    </div>
                )}

                <CardHeader className="flex flex-row items-center gap-4 pt-10">
                    <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-primary/10 transition-transform group-hover:scale-110">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{user.name}</CardTitle>
                        {user.username && (
                            <p className="text-xs text-muted-foreground mb-0.5">@{user.username}</p>
                        )}
                        <CardDescription className="capitalize text-primary font-medium">{user.jobTitle || user.role}</CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{user.email}</span>
                    </div>
                    {user.contactNumber && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="mr-2 h-4 w-4 shrink-0" />
                            <span>{user.contactNumber}</span>
                        </div>
                    )}
                    {canViewSalary && user.salary && user.salary > 0 && (
                        <div className="flex items-center text-sm font-medium text-green-500">
                            <Banknote className="mr-2 h-4 w-4" />
                            {user.salary.toLocaleString()}/mo
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
