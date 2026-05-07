import mongoose, { Model, Schema } from "mongoose";

type SingularityToolActionDoc = {
    name?: string;
    displayName?: string;
    status?: "calling" | "done" | "error";
    summary?: string;
    success?: boolean;
};

type SingularityChatMessageDoc = {
    role: "user" | "model";
    content: string;
    thinking?: string;
    images?: string[];
    attachments?: {
        fileName?: string;
        fileType?: "image" | "document";
        mimeType?: string;
    }[];
    toolActions?: SingularityToolActionDoc[];
    timestamp: string;
};

type SingularityChatSessionDoc = {
    id: string;
    agencyId: string;
    userId: string;
    title: string;
    mode: "chat" | "agent";
    messages: SingularityChatMessageDoc[];
    createdAt: string;
    updatedAt: string;
};

type SingularityCheckpointActionDoc = {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: "task" | "project" | "client" | "user" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
    entityId: string;
    beforeSnapshot?: Record<string, unknown>;
    createdEntityIds?: string[];
    executedAt: string;
};

type SingularityCheckpointDoc = {
    id: string;
    sessionId: string;
    agencyId: string;
    messageIndex: number;
    actions: SingularityCheckpointActionDoc[];
    label: string;
    status: "active" | "rolled_back";
    createdAt: string;
};

const SingularityChatMessageSchema = new Schema({
    role: { type: String, enum: ["user", "model"], required: true },
    content: { type: String, default: "" },
    thinking: { type: String },
    images: [{ type: String }],
    attachments: [{
        fileName: { type: String },
        fileType: { type: String, enum: ["image", "document"] },
        mimeType: { type: String },
        _id: false,
    }],
    toolActions: [{
        name: { type: String },
        displayName: { type: String },
        status: { type: String, enum: ["calling", "done", "error"] },
        summary: { type: String },
        success: { type: Boolean },
        _id: false,
    }],
    timestamp: { type: String, required: true },
}, { _id: false });

const SingularityChatSessionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "New Chat" },
    mode: { type: String, enum: ["chat", "agent"], required: true, default: "chat" },
    messages: [SingularityChatMessageSchema],
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
}, { timestamps: false });

SingularityChatSessionSchema.index({ userId: 1, updatedAt: -1 });

const CheckpointActionSchema = new Schema({
    toolName: { type: String, required: true },
    actionType: { type: String, enum: ["create", "update", "delete"], required: true },
    entityType: { type: String, enum: ["task", "project", "client", "user", "invoice", "transaction", "service", "leaveRequest", "comment"], required: true },
    entityId: { type: String, required: true },
    beforeSnapshot: { type: Schema.Types.Mixed },
    createdEntityIds: [{ type: String }],
    executedAt: { type: String, required: true },
}, { _id: false });

const SingularityCheckpointSchema = new Schema({
    id: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, index: true },
    agencyId: { type: String, required: true, index: true },
    messageIndex: { type: Number, required: true },
    actions: [CheckpointActionSchema],
    label: { type: String, default: "Checkpoint" },
    status: { type: String, enum: ["active", "rolled_back"], default: "active" },
    createdAt: { type: String, required: true },
}, { timestamps: false });

SingularityCheckpointSchema.index({ sessionId: 1, createdAt: -1 });

export const SingularityChatSessionModel =
    (mongoose.models.SingularityChatSession as Model<SingularityChatSessionDoc>)
    || mongoose.model<SingularityChatSessionDoc>("SingularityChatSession", SingularityChatSessionSchema);

export const SingularityCheckpointModel =
    (mongoose.models.SingularityCheckpoint as Model<SingularityCheckpointDoc>)
    || mongoose.model<SingularityCheckpointDoc>("SingularityCheckpoint", SingularityCheckpointSchema);
