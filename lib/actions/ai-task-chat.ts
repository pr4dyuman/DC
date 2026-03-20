import "server-only";

import type { Asset, Task, User } from "../db";
import type { AIConfig } from "../types";
import { generateContentWithChat } from "../ai-provider";
import { getResolvedFeatureConfig, resolveModel } from "../ai-provider-shared";
import { logAIUsage } from "../ai-usage";
import { createSession } from "../live-session";
import { AssetModel, TaskModel, UserModel, connectDB } from "../mongodb";

export type ChatMessage = {
    role: "user" | "model";
    content: string;
};

type ChatContextData = {
    tasks: Task[];
    users: Array<Pick<User, "id" | "name">>;
    assets: Asset[];
};

function buildChatSystemInstruction(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    data: ChatContextData
): string {
    const allProjectTasks = data.tasks.filter((task) => task.projectId === projectId);
    const tasksSummary = allProjectTasks.slice(0, 15)
        .map((task) => {
            const assignee = data.users.find((user) => user.id === task.assigneeId);
            return `- ${task.title} (${task.status}) [${assignee?.name || "Unassigned"}]`;
        }).join("\n");

    const projectAssets = data.assets.filter((asset) => asset.projectId === projectId && asset.aiEnabled);
    let assetContext = "";
    projectAssets
        .filter((asset) => ["file", "code", "link"].includes(asset.type) && asset.content)
        .forEach((asset) => {
            assetContext += `\n--- Asset: ${asset.name} ---\n${asset.content?.substring(0, 2000) || "(Empty)"}\n`;
        });

    return `You are Singularity, a Senior Technical Project Manager & Agile Coach.
You are helping a user create and refine a task.

### PROJECT BOARD
${tasksSummary || "(No tasks yet)"}

### KNOWLEDGE BASE
${assetContext || "(No assets available)"}

### CURRENT TASK
**Title**: ${currentTitle}
**Draft**: ${currentDescription || "(Empty)"}

### YOUR ROLE
- Help clarify, refine, and structure the task
- If asked to generate/write the task, provide a full Markdown description
- If asked about project assets, answer using the knowledge base
- Be professional, concise, and actionable
- Use Markdown formatting (bold, lists, headings)`;
}

export async function createAISessionImpl(
    aiConfig: AIConfig,
    agencyId: string,
    projectId: string,
    currentTitle: string,
    currentDescription: string
): Promise<string> {
    const featureConfig = getResolvedFeatureConfig(aiConfig, "taskChatbot");
    const modelId = resolveModel(featureConfig);
    if (!modelId.includes("native-audio")) {
        return "legacy";
    }

    await connectDB();
    const [tasks, users, assets] = await Promise.all([
        TaskModel.find({ projectId, agencyId }).lean() as Promise<Task[]>,
        UserModel.find({ agencyId }).select("-password").lean() as Promise<Array<Pick<User, "id" | "name">>>,
        AssetModel.find({ projectId, aiEnabled: true, agencyId }).lean() as Promise<Asset[]>,
    ]);
    const data: ChatContextData = { tasks, users, assets };
    const systemInstruction = buildChatSystemInstruction(projectId, currentTitle, currentDescription, data);

    const sessionId = await createSession(aiConfig.apiKey, modelId, systemInstruction);
    console.log(`[AI Session] Created ${sessionId} for project ${projectId}`);
    return sessionId;
}

export async function chatWithTaskAIImpl(
    aiConfig: AIConfig,
    agencyId: string,
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    history: ChatMessage[],
    userMessage: string,
    userId: string
): Promise<string> {
    await connectDB();
    const [tasks, users, assets] = await Promise.all([
        projectId ? TaskModel.find({ projectId, agencyId }).lean() as Promise<Task[]> : Promise.resolve([] as Task[]),
        UserModel.find({ agencyId }).select("-password").lean() as Promise<Array<Pick<User, "id" | "name">>>,
        projectId ? AssetModel.find({ projectId, aiEnabled: true, agencyId }).lean() as Promise<Asset[]> : Promise.resolve([] as Asset[]),
    ]);
    const data: ChatContextData = { tasks, users, assets };
    const systemInstruction = buildChatSystemInstruction(projectId || "", currentTitle || "", currentDescription || "", data);

    try {
        const featureConfig = getResolvedFeatureConfig(aiConfig, "taskChatbot");
        const { text, tokens } = await generateContentWithChat(featureConfig, history, systemInstruction, userMessage);
        logAIUsage({ agencyId, userId, feature: "ai-task-chat", model: featureConfig.model, provider: featureConfig.provider, ...tokens });
        return text;
    } catch (error: unknown) {
        console.error("Singularity Chat Error:", error);
        return "I encountered an error. Please try again.";
    }
}
