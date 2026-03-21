"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/** Regex to match @[Display Name](userId) */
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Convert raw storage string → HTML for contenteditable.
 * Mentions become non-editable chips; plain text becomes escaped text nodes.
 */
function rawToHtml(raw: string): string {
    // Escape HTML entities in non-mention parts
    const parts = raw.split(MENTION_REGEX);
    // raw.split with capturing groups: [before, name, id, after, name, id, ...]
    let html = "";
    let i = 0;
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(raw)) !== null) {
        const before = raw.slice(lastIndex, m.index);
        if (before) {
            html += escapeHtml(before);
        }
        const name = m[1];
        const id = m[2];
        html += `<span class="mention-chip" data-mention-id="${escapeAttr(id)}" data-mention-name="${escapeAttr(name)}" contenteditable="false">@${escapeHtml(name)}</span>`;
        lastIndex = m.index + m[0].length;
    }
    const tail = raw.slice(lastIndex);
    if (tail) html += escapeHtml(tail);
    return html;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

function escapeAttr(str: string): string {
    return str.replace(/"/g, "&quot;");
}

/**
 * Walk the contenteditable DOM and reconstruct the raw storage string.
 */
function htmlToRaw(container: HTMLElement): string {
    let result = "";
    container.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.textContent ?? "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === "BR") {
                result += "\n";
            } else if (el.classList.contains("mention-chip")) {
                const id = el.getAttribute("data-mention-id") ?? "";
                const name = el.getAttribute("data-mention-name") ?? "";
                result += `@[${name}](${id})`;
            } else if (el.tagName === "DIV" || el.tagName === "P") {
                const inner = htmlToRaw(el);
                result += (result.length > 0 ? "\n" : "") + inner;
            } else {
                result += htmlToRaw(el);
            }
        }
    });
    return result;
}

/**
 * Get the raw text before the cursor in the contenteditable.
 * Mention chips are expanded back to @[name](id) for detection.
 */
function getRawBeforeCaret(editor: HTMLElement): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";

    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);

    const preRange = document.createRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.startContainer, range.startOffset);

    // Clone the fragment and convert to raw
    const frag = preRange.cloneContents();
    const temp = document.createElement("div");
    temp.appendChild(frag);
    return htmlToRaw(temp);
}

export function MentionTextarea({
    value,
    onChange,
    users,
    placeholder,
    className,
    onKeyDown,
}: MentionTextareaProps) {
    const router = useRouter();
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);
    // Track whether we initialized the editor
    const initializedRef = useRef(false);

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isEmpty, setIsEmpty] = useState(!value);

    const filteredUsers = users
        .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 5);

    // Initialize editor HTML on mount only
    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;
        editor.innerHTML = rawToHtml(value);
        initializedRef.current = true;
        setIsEmpty(!value.trim());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync when value is externally reset (e.g. cleared to "" after submit)
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const currentRaw = htmlToRaw(editor);
        // Only reset if value was cleared/changed externally and differs from current DOM
        if (value === "" && currentRaw !== "") {
            editor.innerHTML = "";
            setIsEmpty(true);
            setShowSuggestions(false);
        }
    }, [value]);

    const detectMention = useCallback((rawBefore: string) => {
        const match = rawBefore.match(/(^|\s)@([^\s@\[\]]*)$/);
        if (match) {
            setMentionQuery(match[2]);
            setShowSuggestions(true);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    }, []);

    const handleInput = useCallback(() => {
        if (isComposingRef.current) return;
        const editor = editorRef.current;
        if (!editor) return;
        const raw = htmlToRaw(editor);
        onChange(raw);
        setIsEmpty(!raw.trim());

        const rawBefore = getRawBeforeCaret(editor);
        detectMention(rawBefore);
    }, [onChange, detectMention]);

    /** Insert a mention chip at the current @-trigger position */
    const insertMention = useCallback(
        (user: MentionUser) => {
            const editor = editorRef.current;
            if (!editor) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            // Find how many characters to delete (@ + query)
            const rawBefore = getRawBeforeCaret(editor);
            const atMatch = rawBefore.match(/(^|\s)@([^\s@\[\]]*)$/);
            if (!atMatch) return;
            let charsToDelete = 1 + atMatch[2].length; // "@" + query length

            const range = selection.getRangeAt(0);
            let caretNode: Node = range.startContainer;
            let caretOffset = range.startOffset;

            // Delete backwards through text nodes
            while (charsToDelete > 0) {
                if (caretNode.nodeType === Node.TEXT_NODE) {
                    const text = caretNode.textContent ?? "";
                    if (caretOffset >= charsToDelete) {
                        caretNode.textContent =
                            text.slice(0, caretOffset - charsToDelete) + text.slice(caretOffset);
                        caretOffset -= charsToDelete;
                        charsToDelete = 0;
                    } else {
                        charsToDelete -= caretOffset;
                        caretNode.textContent = text.slice(caretOffset);
                        caretOffset = 0;
                        const prev = caretNode.previousSibling;
                        if (prev) {
                            caretNode = prev;
                            caretOffset =
                                prev.nodeType === Node.TEXT_NODE
                                    ? (prev.textContent ?? "").length
                                    : 1;
                        } else if (caretNode.parentNode && caretNode.parentNode !== editor) {
                            caretNode = caretNode.parentNode;
                            caretOffset = 0;
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            }

            // Build the chip element
            const chip = document.createElement("span");
            chip.className = "mention-chip";
            chip.setAttribute("data-mention-id", user.id);
            chip.setAttribute("data-mention-name", user.name);
            chip.setAttribute("contenteditable", "false");
            chip.textContent = `@${user.name}`;

            // Insert chip at caret
            const insertRange = document.createRange();
            insertRange.setStart(caretNode, caretOffset);
            insertRange.collapse(true);
            insertRange.insertNode(chip);

            // Insert a space after chip for comfortable typing
            const space = document.createTextNode("\u00A0");
            chip.after(space);

            // Move caret after the space
            const finalRange = document.createRange();
            finalRange.setStart(space, 1);
            finalRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(finalRange);

            setShowSuggestions(false);

            // Sync state
            const raw = htmlToRaw(editor);
            onChange(raw);
            setIsEmpty(false);
            editor.focus();
        },
        [onChange]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (showSuggestions && filteredUsers.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex]);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }
        }
        onKeyDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const chip = target.closest(".mention-chip") as HTMLElement | null;
        if (chip) {
            const id = chip.getAttribute("data-mention-id");
            if (id) {
                router.push(`/dashboard/team/${id}`);
            }
        }
    };

    return (
        <div className="relative">
            {/* Scoped styles for mention chips */}
            <style>{`
                .mention-editor[data-empty="true"]:before {
                    content: attr(data-placeholder);
                    color: hsl(var(--muted-foreground));
                    pointer-events: none;
                    position: absolute;
                    top: 0.5rem;
                    left: 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    white-space: pre-wrap;
                }
                .mention-editor {
                    min-height: 72px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    outline: none;
                    line-height: 1.5;
                }
                .mention-editor .mention-chip {
                    display: inline;
                    background: none;
                    color: inherit;
                    font-weight: 700;
                    font-size: 1em;
                    cursor: pointer;
                    user-select: none;
                    text-decoration: none;
                    border-bottom: 1.5px dotted currentColor;
                    padding-bottom: 0.5px;
                    opacity: 0.85;
                    transition: opacity 0.15s, border-color 0.15s;
                    white-space: nowrap;
                }
                .mention-editor .mention-chip:hover {
                    opacity: 1;
                    border-bottom-style: solid;
                }
            `}</style>

            <div
                ref={editorRef}
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                data-empty={isEmpty ? "true" : undefined}
                className={cn(
                    "mention-editor relative flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    className
                )}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => {
                    isComposingRef.current = false;
                    handleInput();
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />

            {/* Mention suggestions dropdown */}
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
                            onMouseDown={(e) => {
                                e.preventDefault();
                                insertMention(user);
                            }}
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
                                    <span className="text-xs text-muted-foreground truncate">
                                        {user.jobTitle}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
