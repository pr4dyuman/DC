"use client";

import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionUser {
    id: string;
    name: string;
    avatar?: string;
    jobTitle?: string;
}

interface MentionTextareaProps {
    value: string;
    onChange: (value: string) => void;
    users: MentionUser[];
    placeholder?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MentionTextarea({ value, onChange, users, placeholder, className, onKeyDown }: MentionTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);

    const detectMention = useCallback((text: string, cursorPos: number) => {
        const textBeforeCursor = text.slice(0, cursorPos);
        const match = textBeforeCursor.match(/(^|\s)@([^\s@\[\]]*)$/);
        if (match) {
            setMentionQuery(match[2]);
            setShowSuggestions(true);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        detectMention(newValue, e.target.selectionStart);
    };

    const handleClick = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            detectMention(value, textarea.selectionStart);
        }
    };

    const insertMention = useCallback((user: MentionUser) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const textAfterCursor = value.slice(cursorPos);
        const atIndex = textBeforeCursor.search(/(^|\s)@[^\s@\[\]]*$/);
        const actualAtIndex = textBeforeCursor.indexOf('@', atIndex);
        const before = value.slice(0, actualAtIndex);
        const mention = `@[${user.name}](${user.id}) `;
        const newValue = before + mention + textAfterCursor;
        onChange(newValue);
        setShowSuggestions(false);
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = actualAtIndex + mention.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [value, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredUsers.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }
        }
        onKeyDown?.(e);
    };

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={placeholder}
                className={className}
            />
            {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 w-full max-h-[200px] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
                    {filteredUsers.map((user, index) => (
                        <button
                            key={user.id}
                            type="button"
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                "hover:bg-accent",
                                index === selectedIndex && "bg-accent"
                            )}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                        >
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-[10px] bg-indigo-500/10 text-indigo-600">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{user.name}</span>
                                {user.jobTitle && (
                                    <span className="text-xs text-muted-foreground truncate">{user.jobTitle}</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
