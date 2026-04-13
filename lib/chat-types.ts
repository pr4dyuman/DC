import type { Message as BusinessMessage } from "./types-business";

export type Message = BusinessMessage;

export type Contact = {
    id: string;
    username?: string;
    name: string;
    email: string;
    companyName?: string;
    avatar?: string;
    role: string;
    jobTitle?: string;
    type: "user" | "client";
    lastMessage?: Message;
    unreadCount: number;
    isOnline: boolean;
    lastActiveAt?: string;
};
