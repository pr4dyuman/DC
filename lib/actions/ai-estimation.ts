import "server-only";

import { revalidatePath } from "next/cache";
import type { AIConfig } from "../types";
import { generateContent } from "../ai-provider";
import { logAIUsage } from "../ai-usage";
import { TaskModel, connectDB } from "../mongodb";
import { getErrorMessage } from "./shared";

export type EstimatedTaskRecord = {
    id?: string;
    title?: string;
    description?: string;
    priority?: string;
    estimatedHours?: number;
    subtasks?: unknown[];
};

export function estimateHoursFromTask(task: EstimatedTaskRecord): number {
    let hours = 2;

    const title = (task.title || "").toLowerCase();
    const desc = (task.description || "").toLowerCase();
    const combined = `${title} ${desc}`;

    const complexKeywords = ["integration", "migrate", "architecture", "refactor", "database", "authentication", "security", "payment", "deploy", "infrastructure", "api", "redesign", "overhaul"];
    const mediumKeywords = ["implement", "create", "build", "develop", "setup", "configure", "design", "feature", "page", "component", "module", "dashboard"];
    const simpleKeywords = ["fix", "update", "change", "rename", "typo", "color", "text", "label", "padding", "margin", "spacing", "icon", "button", "tooltip"];

    if (complexKeywords.some((keyword) => combined.includes(keyword))) hours = 8;
    else if (mediumKeywords.some((keyword) => combined.includes(keyword))) hours = 4;
    else if (simpleKeywords.some((keyword) => combined.includes(keyword))) hours = 1;

    if (task.priority === "High" || task.priority === "Urgent") hours = Math.max(hours, 4);

    if (desc.length > 500) hours = Math.ceil(hours * 1.5);
    else if (desc.length > 200) hours = Math.ceil(hours * 1.2);

    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        hours += Math.ceil(task.subtasks.length * 0.5);
    }

    return Math.max(0.5, Math.min(hours, 40));
}

export async function bulkEstimateTaskHoursImpl(agencyId: string) {
    await connectDB();

    const tasks = await TaskModel.find({
        agencyId,
        $or: [{ estimatedHours: { $exists: false } }, { estimatedHours: null }, { estimatedHours: 0 }],
    }).lean() as EstimatedTaskRecord[];

    if (tasks.length === 0) {
        return { updated: 0, message: "All tasks already have estimated hours" };
    }

    let updated = 0;
    for (const task of tasks) {
        const hours = estimateHoursFromTask(task);
        await TaskModel.updateOne(
            { id: task.id, agencyId },
            { $set: { estimatedHours: hours } }
        );
        updated++;
    }

    revalidatePath("/dashboard");
    return { updated, message: `Estimated hours for ${updated} tasks` };
}

export async function aiEstimateTaskHoursImpl(
    aiConfig: AIConfig,
    agencyId: string,
    userId: string,
    projectId: string,
    title: string,
    description: string,
    priority: string
): Promise<number> {
    await connectDB();

    const completedTasks = await TaskModel.find({
        projectId,
        status: "Done",
        agencyId,
    }).lean() as EstimatedTaskRecord[];

    const historyLines = completedTasks
        .filter((task) => task.estimatedHours && task.estimatedHours > 0)
        .slice(0, 30)
        .map((task) => `- "${task.title}" -> ${task.estimatedHours}h (Priority: ${task.priority || "Medium"})`)
        .join("\n");

    const prompt = `You are a project estimation expert. Estimate the hours needed for this task.

### TASK TO ESTIMATE
**Title**: ${title}
**Description**: ${description || "(No description)"}
**Priority**: ${priority || "Medium"}

### COMPLETED TASKS FROM THIS PROJECT (for reference)
${historyLines || "(No historical data available)"}

### RULES
- Compare with similar completed tasks above when available.
- If a similar task was completed before, use that as a baseline and adjust.
- Use 0.5h increments. Range: 0.5 - 40 hours.
- Simple tasks (typo, text, icon): 0.5-1h
- Small tasks (fix, button, tooltip): 1-2h
- Medium tasks (feature, form, component): 2-8h
- Complex tasks (integration, refactor, architecture): 8-24h
- Major tasks (migration, full redesign): 24-40h
- Return ONLY a single number. No text, no explanation, no units.`;

    try {
        const { text, tokens } = await generateContent(aiConfig, prompt);
        logAIUsage({ agencyId, userId, feature: "ai-hour-estimate", model: aiConfig.model || "unknown", provider: aiConfig.provider, ...tokens });
        const cleaned = text.trim().replace(/[^0-9.]/g, "");
        const hours = parseFloat(cleaned);
        if (isNaN(hours) || hours <= 0) return estimateHoursFromTask({ title, description, priority });
        return Math.max(0.5, Math.min(Math.round(hours * 2) / 2, 40));
    } catch (error: unknown) {
        console.error("[aiEstimateTaskHours] Error:", getErrorMessage(error));
        return estimateHoursFromTask({ title, description, priority });
    }
}
