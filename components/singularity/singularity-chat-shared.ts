import DOMPurify from "dompurify";

export interface Attachment {
    id: string;
    file: File;
    preview: string;
    base64: string;
    mimeType: string;
    textContent?: string;
    fileType: "image" | "document";
    fileName?: string;
}

export interface CheckpointAction {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: "task" | "project" | "client" | "user" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
    entityId: string;
    beforeSnapshot?: unknown;
    createdEntityIds?: string[];
    executedAt: string;
}

export interface ToolAction {
    name: string;
    displayName: string;
    status: "calling" | "done" | "error";
    summary?: string;
    success?: boolean;
    rollbackData?: CheckpointAction[];
}

export interface MessageAttachment {
    fileName: string;
    fileType: "image" | "document";
    mimeType?: string;
}

export interface Message {
    id: string;
    role: "user" | "model";
    content: string;
    thinking?: string;
    images?: string[];
    attachments?: MessageAttachment[];
    timestamp: Date;
    isStreaming?: boolean;
    toolActions?: ToolAction[];
}

export interface ChatSessionSummary {
    id: string;
    title: string;
    mode: "chat" | "agent";
    updatedAt: string;
    messageCount: number;
}

export interface CheckpointInfo {
    id: string;
    label: string;
    messageIndex: number;
    messageId?: string;
    createdAt: string;
}

export interface ConflictInfo {
    entityType: string;
    entityId: string;
    entityName: string;
    reason: string;
}

export interface RollbackAnalysis {
    checkpointId: string;
    label: string;
    totalActions: number;
    safeActions: CheckpointAction[];
    conflictedActions: { action: CheckpointAction; conflict: ConflictInfo }[];
}

export interface PersistedMessage {
    id?: string;
    role: "user" | "model";
    content: string;
    thinking?: string;
    images?: string[];
    attachments?: MessageAttachment[];
    timestamp: string;
    toolActions?: Omit<ToolAction, "rollbackData">[];
}

export interface SessionResponse {
    mode?: "chat" | "agent";
    messages?: PersistedMessage[];
}

export interface CheckpointCreateResponse {
    checkpointId: string;
}

export interface SingularityRequestBody {
    history: Array<{ role: "user" | "model"; content: string }>;
    message: string;
    mode: "chat" | "agent";
    userId?: string;
    images?: Array<{ base64: string; mimeType: string }>;
    documents?: Array<{ fileName?: string; mimeType: string; textContent?: string; base64?: string }>;
    isHeavyTask?: boolean;
}

export const CHAT_SUGGESTIONS = [
    { emoji: "\u270F\uFE0F", label: "Write anything" },
    { emoji: "\uD83D\uDCE7", label: "Draft an email" },
    { emoji: "\uD83D\uDCA1", label: "Brainstorm ideas" },
    { emoji: "\uD83D\uDCCB", label: "Plan a sprint" },
    { emoji: "\uD83D\uDD0D", label: "Research a topic" },
];

export const AGENT_SUGGESTIONS = [
    { emoji: "\uD83C\uDFAF", label: "Create a project" },
    { emoji: "\uD83D\uDCCA", label: "Finance summary" },
    { emoji: "\uD83D\uDC65", label: "Team workload" },
    { emoji: "\uD83D\uDCCB", label: "List projects" },
    { emoji: "\u2705", label: "Add a client" },
];

export const ACCEPTED_DOCS = ["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "text/html"];
export const DOC_EXTENSIONS = [".pdf", ".txt", ".md", ".csv", ".json", ".html", ".prd", ".doc", ".docx"];

export const SUGGESTION_SEED_HISTORY: Record<string, { role: "user" | "model"; content: string }[]> = {
    "Write anything": [
        { role: "user", content: "Hi, I need help writing something." },
        { role: "model", content: "Sure! What would you like me to help you write? I can draft emails, reports, proposals, social media posts, or anything else you need." },
    ],
    "Draft an email": [
        { role: "user", content: "I need to draft a professional email." },
        { role: "model", content: "I'd be happy to help draft an email. Who is it for, and what's the main purpose or message you'd like to convey?" },
    ],
    "Brainstorm ideas": [
        { role: "user", content: "I want to brainstorm some ideas." },
        { role: "model", content: "Let's brainstorm! What topic or area are you looking for ideas in? Marketing, product features, content, business strategies?" },
    ],
    "Plan a sprint": [
        { role: "user", content: "Help me plan a sprint for my team." },
        { role: "model", content: "Let's plan your sprint. How long is the sprint, and what are the key goals or features you want to deliver?" },
    ],
    "Research a topic": [
        { role: "user", content: "I need to research a topic." },
        { role: "model", content: "I can help with research. What topic would you like me to look into? I'll provide a comprehensive overview." },
    ],
    "Create a project": [
        { role: "user", content: "I want to create a new project." },
        { role: "model", content: "I can help set up a new project. What's the project name, and do you have details like the client, deadline, or budget in mind?" },
    ],
    "Finance summary": [
        { role: "user", content: "Show me a summary of the finances." },
        { role: "model", content: "I'll pull up the financial overview for you. Let me check the latest invoices, payments, and revenue data." },
    ],
    "Team workload": [
        { role: "user", content: "How is the team workload looking?" },
        { role: "model", content: "Let me check the current task distribution and workload across your team members." },
    ],
    "List projects": [
        { role: "user", content: "Can you list all the current projects?" },
        { role: "model", content: "Sure, let me fetch all your active projects with their status and details." },
    ],
    "Add a client": [
        { role: "user", content: "I need to add a new client." },
        { role: "model", content: "I can add a new client for you. What's the client's name, email, and company? I'll also need a phone number if available." },
    ],
};

export function renderMarkdown(text: string): string {
    if (!text) return "";

    const html = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted border border-border rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-violet-600 dark:text-violet-300">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-foreground">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-1.5 text-foreground">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h1>')
        .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside">$1</li>')
        .replace(/^- \[x\] (.+)$/gm, '<li class="ml-4 flex items-center gap-1.5"><span class="text-emerald-400">✓</span> <span class="line-through opacity-60">$1</span></li>')
        .replace(/^- \[ \] (.+)$/gm, '<li class="ml-4 flex items-center gap-1.5"><span class="text-muted-foreground">○</span> $1</li>')
        .replace(/\n\n/g, '<div class="h-2"></div>')
        .replace(/\n/g, "<br/>");

    return DOMPurify.sanitize(html);
}
