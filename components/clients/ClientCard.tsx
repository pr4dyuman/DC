
"use client";

import { Client } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Briefcase, Phone, MapPin, ArchiveRestore, Archive } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ClientCardProps {
    client: Client;
    onEdit?: (client: Client) => void;
    onUnarchive?: (clientId: string, clientName: string) => void;
    onDelete?: (clientId: string, clientName: string) => void;
    isArchived?: boolean;
}

export function ClientCard({ client, onEdit, onUnarchive, onDelete, isArchived }: ClientCardProps) {
    return (
        <Link href={`/dashboard/clients/${client.username || client.id}`} className="block h-full">
            <Card className="group relative overflow-hidden transition-all hover:shadow-lg h-full border-border hover:border-pink-500/50 hover:bg-muted cursor-pointer">
                {(onEdit || onUnarchive || onDelete) && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        {isArchived && onUnarchive ? (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUnarchive(client.id, client.name);
                                }}
                                className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                                title="Restore client"
                            >
                                <ArchiveRestore className="h-3 w-3" />
                            </button>
                        ) : (
                            <>
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onEdit(client);
                                        }}
                                        className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80"
                                        title="Edit client"
                                    >
                                        <span className="sr-only">Edit</span>
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64584 8.647 3.58564 8.72531 3.53033 8.80868L3.53033 8.80868L2 12.9999L6.19122 11.4696L6.19122 11.4696C6.27463 11.4143 6.35304 11.3541 6.42171 11.2854L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.41421 9.41421L3.99998 12.0001L6.58579 11.5858L10.5 7.67157L8.32843 5.5L4.41421 9.41421ZM11.4142 2.41421L12.5858 3.58579L11.5 4.67157L10.3284 3.5L11.4142 2.41421Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onDelete(client.id, client.name);
                                        }}
                                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                                        title="Archive client"
                                    >
                                        <Archive className="h-3 w-3" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/10 transition-transform group-hover:scale-110">
                        <AvatarImage src={client.logo} alt={client.companyName} />
                        <AvatarFallback>{client.companyName ? client.companyName.substring(0, 2).toUpperCase() : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <CardTitle className="text-lg group-hover:text-pink-500 transition-colors truncate">{client.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mb-0.5 truncate">{client.companyName}</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{client.phone}</span>
                        </div>
                    )}
                    {client.address && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{client.address}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
