import "server-only";

import type { Asset, Task, User } from "../db";
import type { AIConfig } from "../types";
import { generateContent, generateContentWithParts } from "../ai-provider";
import { logAIUsage } from "../ai-usage";
import { AssetModel, ProjectModel, ServiceModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { getErrorMessage } from "./shared";
import {
    buildProjectServiceLookupQuery,
    getProjectServiceDisplayNames,
    mapProjectServicesByProjectId,
    type ProjectLike,
    type ProjectServiceSnapshot,
} from "./projects-shared";

type AssetPromptPart =
    | { text: string }
    | { inlineData: { data: string; mimeType: string } };

export type ExtractedTaskFields = {
    title?: string;
    description?: string;
    category?: string;
    priority?: "Low" | "Medium" | "High";
    estimatedHours?: number;
};

export async function extractTaskFieldsImpl(
    aiConfig: AIConfig,
    aiResponseText: string,
    availableCategories: string[]
): Promise<ExtractedTaskFields> {
    const systemInstruction = `You are a task field extractor. Given an AI-generated task description or discussion, extract structured fields for creating a project task.

RULES:
- "title": A short, actionable task title (max 10 words). If the text is a conversation, extract the core task.
- "description": The full task description with details, acceptance criteria, steps, etc. Preserve formatting.
- "category": Pick the BEST matching category from this list: [${availableCategories.join(", ")}]. If none match well, return empty string.
- "priority": One of "Low", "Medium", "High". Infer from urgency/importance cues. Default to "Medium" if unclear.
- "estimatedHours": Estimate the number of hours this task will take based on complexity and scope. Use increments of 0.5. Simple tasks: 0.5-2h, medium: 2-8h, complex: 8-40h. Return a number.

Return ONLY valid JSON. No markdown fences, no extra text. Example:
{"title":"Implement user login","description":"Create a login page with...","category":"Web Development","priority":"High","estimatedHours":4}`;

    const prompt = `Extract task fields from this AI response:\n\n${aiResponseText}`;

    try {
        const { text } = await generateContent(aiConfig, prompt, systemInstruction);
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned) as ExtractedTaskFields;
        if (parsed.category && !availableCategories.includes(parsed.category)) {
            parsed.category = "";
        }
        if (parsed.priority && !["Low", "Medium", "High"].includes(parsed.priority)) {
            parsed.priority = "Medium";
        }
        return parsed;
    } catch (error: unknown) {
        console.error("[extractTaskFields] Error:", getErrorMessage(error));
        return { description: aiResponseText };
    }
}

export async function enhanceTaskDescriptionImpl(
    aiConfig: AIConfig,
    agencyId: string,
    projectId: string,
    title: string,
    content: string,
    userId: string
): Promise<string> {
    await connectDB();

    const [project, allProjectTasks, projectAssets] = await Promise.all([
        ProjectModel.findOne({ id: projectId, agencyId }).lean() as Promise<ProjectLike | null>,
        TaskModel.find({ projectId, agencyId }).lean() as Promise<Task[]>,
        AssetModel.find({ projectId, aiEnabled: true, agencyId }).lean() as Promise<Asset[]>,
    ]);

    const tasksSummary = allProjectTasks.slice(0, 10).map((projectTask) => `- ${projectTask.title} (${projectTask.status})`).join("\n");
    let assetContext = "";
    projectAssets
        .filter((asset) => ["file", "code", "link"].includes(asset.type) && asset.content)
        .forEach((asset) => {
            assetContext += `\n--- Asset: ${asset.name} ---\n${asset.content?.substring(0, 2000) || "(Empty)"}\n`;
        });

    const isEnhancement = content.length > 20;
    const actionType = isEnhancement ? "Refine and Format" : "Generate from scratch";

    const prompt = `You are a Senior Technical Project Manager.
${actionType} a task description for: "${title}"

### PROJECT CONTEXT
**Project**: ${project?.client || "General"}
**Board**: ${tasksSummary || "(Empty)"}
**Knowledge Base**: ${assetContext || "(None)"}

### DRAFT
${content || "(No draft provided)"}

### INSTRUCTIONS
${isEnhancement ?
        `Polish this draft into a professional task specification:
- Use Markdown structure (## Headers, - Bullets)
- Add an Acceptance Criteria section with verifiable requirements
- Cross-reference the Knowledge Base for correct terminology
- Remove ambiguity, keep it actionable` :

        `Generate a complete task specification from the title:
- Include: Objective, Implementation Steps, Technical Considerations, Acceptance Criteria (3-5 items)
- Infer details from the Knowledge Base and Board context
- Use Markdown with clear structure`
    }

Return ONLY the Markdown content.`;

    try {
        const { text, tokens } = await generateContent(aiConfig, prompt);
        logAIUsage({ agencyId, userId, feature: "ai-enhance", model: aiConfig.model || "unknown", provider: aiConfig.provider, ...tokens });
        return text;
    } catch (error: unknown) {
        console.error("Enhance Task Error", error);
        return content;
    }
}

export async function explainTaskImpl(
    aiConfig: AIConfig,
    agencyId: string,
    taskId: string,
    userId: string
): Promise<string> {
    await connectDB();

    const task = await TaskModel.findOne({ id: taskId, agencyId }).lean() as Task | null;
    if (!task) throw new Error("Task not found");

    const [project, assignee, allProjectTasks, projectAssetsRaw] = await Promise.all([
        ProjectModel.findOne({ id: task.projectId, agencyId }).lean() as Promise<ProjectLike | null>,
        task.assigneeId
            ? UserModel.findOne({ id: task.assigneeId, agencyId }).select("-password").lean() as Promise<Pick<User, "name"> | null>
            : Promise.resolve(null),
        TaskModel.find({ projectId: task.projectId, agencyId }).lean() as Promise<Task[]>,
        AssetModel.find({ projectId: task.projectId, aiEnabled: true, agencyId }).lean() as Promise<Asset[]>,
    ]);

    const serviceLookupQuery = project ? buildProjectServiceLookupQuery([project]) : null;
    const projectServices = serviceLookupQuery
        ? await ServiceModel.find({ agencyId, ...serviceLookupQuery })
            .select("id name projectId employees agencyId")
            .lean() as ProjectServiceSnapshot[]
        : [];
    const resolvedProjectServices = project
        ? mapProjectServicesByProjectId([project], projectServices).get(project.id) || []
        : [];

    const userIds = [...new Set(allProjectTasks.map((projectTask) => projectTask.assigneeId).filter((id): id is string => Boolean(id)))];
    const users = await UserModel.find({ id: { $in: userIds }, agencyId }).select("-password").lean() as Array<Pick<User, "id" | "name">>;
    const userMap = Object.fromEntries(users.map((user) => [user.id, user.name] as const));

    const tasksByStatus: Record<Task["status"], string[]> = {
        Todo: allProjectTasks.filter((projectTask) => projectTask.status === "Todo").map((projectTask) => `- ${projectTask.title} (${userMap[projectTask.assigneeId] || "Unassigned"})`),
        "In Progress": allProjectTasks.filter((projectTask) => projectTask.status === "In Progress").map((projectTask) => `- ${projectTask.title} (${userMap[projectTask.assigneeId] || "Unassigned"})`),
        Review: allProjectTasks.filter((projectTask) => projectTask.status === "Review").map((projectTask) => `- ${projectTask.title} (${userMap[projectTask.assigneeId] || "Unassigned"})`),
        Done: allProjectTasks.filter((projectTask) => projectTask.status === "Done").map((projectTask) => `- ${projectTask.title} (${userMap[projectTask.assigneeId] || "Unassigned"})`),
    };

    const boardSummary = `
    Current Board State:
    TO DO:
    ${tasksByStatus.Todo.join("\n") || "(None)"}

    IN PROGRESS:
    ${tasksByStatus["In Progress"].join("\n") || "(None)"}

    IN REVIEW:
    ${tasksByStatus.Review.join("\n") || "(None)"}

    DONE:
    ${tasksByStatus.Done.join("\n") || "(None)"}
    `;

    const context = {
        task: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: assignee ? assignee.name : "Unassigned",
            dueDate: task.dueDate,
        },
        project: project ? {
            name: project.client || "Unknown Client",
            departments: getProjectServiceDisplayNames(project.services, resolvedProjectServices).join(", ") || "General",
        } : null,
        comments: task.comments || [],
    };

    let promptText = `You are a Senior Technical Project Manager & Solution Architect.
Provide a comprehensive, actionable analysis of this task.

### PROJECT
**Project**: ${context.project?.name}
**Departments**: ${context.project?.departments}

${boardSummary}

### TARGET TASK
**Title**: ${context.task.title}
**Status**: ${context.task.status} | **Priority**: ${context.task.priority}
**Assignee**: ${context.task.assignee}
**Due Date**: ${context.task.dueDate}

**Description**:
${context.task.description || "No description provided."}

**Recent Comments**:
${context.comments.length > 0 ? context.comments.map((comment) => `- ${comment.text}`).join("\n") : "No comments yet."}


### INSTRUCTIONS
- Analyze any provided assets (code, docs, images) and reference them specifically.
- Check the board state for duplicates, blockers, or bottlenecks.
- Provide: a task summary, strategic advice (pitfalls, dependencies, tips), and recommended next steps as a checklist.
- Use Markdown with headings and bullet points.
`;

    const textAssets = projectAssetsRaw.filter((asset) => ["file", "code", "link"].includes(asset.type) && asset.content);
    if (textAssets.length > 0) {
        promptText += `\n\n### PROJECT ASSETS (KNOWLEDGE BASE)\n`;
        textAssets.forEach((asset) => {
            promptText += `\n#### FILE: ${asset.name} (${asset.type})\n\`\`\`\n${asset.content?.substring(0, 5000) || "(Empty)"}\n\`\`\`\n`;
        });
    } else {
        promptText += `\n\n(No text-based assets enabled for AI context. Advice will be general.)\n`;
    }

    const parts: AssetPromptPart[] = [{ text: promptText }];
    const imageAssets = projectAssetsRaw.filter((asset) => asset.type === "image" && asset.url);
    if (imageAssets.length > 0) {
        console.log(`[explainTask] Attaching ${imageAssets.length} images`);

        imageAssets.forEach((img) => {
            if (img.url.startsWith("data:image/")) {
                try {
                    const base64Data = img.url.split(",")[1];
                    const mimeType = img.url.split(";")[0].split(":")[1];
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType,
                        },
                    });
                } catch (error) {
                    console.error("Failed to process image data URL", error);
                }
            }
        });
    }

    try {
        const { text, tokens } = await generateContentWithParts(aiConfig, parts);
        logAIUsage({ agencyId, userId, feature: "ai-explain", model: aiConfig.model || "unknown", provider: aiConfig.provider, ...tokens });
        return text;
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("[explainTask] Singularity error:", message);
        return `Singularity Error: ${message || "Unknown error"}`;
    }
}
