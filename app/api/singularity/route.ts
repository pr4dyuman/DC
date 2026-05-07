import { NextRequest, NextResponse } from "next/server";
import { getAgencyAIConfigServer } from "@/lib/utils-server";
import { buildSingularityContext } from "@/lib/singularity-context";
import { SINGULARITY_TOOL_DECLARATIONS } from "@/lib/singularity-tool-defs";
import {
    handleLiveAgentMode,
    handleNonLiveAgentMode,
} from "@/lib/singularity-route-agent";
import { handleChatModeRequest } from "@/lib/singularity-route-chat";
import { getSessionUser } from "@/lib/auth";
import { getAIPermissions } from "@/lib/actions";
import { hasExplicitAIAccessSetting } from "@/lib/actions/access";
import { resolveModel, getResolvedFeatureConfig } from "@/lib/ai-provider-shared";
import { getCurrentAgency, checkTrialExpired } from "@/lib/agency-context";
import { getPromptConfigPublic } from "@/lib/actions/super-admin";
import {
    buildConversationPrompt,
    filterToolsByPermissions as filterToolsByPermissionsHelper,
    getErrorMessage,
    normalizeSingularityRequestBody,
    validateSingularityPayloadLimits,
    type SingularityRequestBody,
} from "@/lib/singularity-route-helpers";
import { validateCsrfOrigin } from "@/lib/validation";
import type { AIPermissions } from "@/lib/types";

function filterToolsByPermissions(
    tools: typeof SINGULARITY_TOOL_DECLARATIONS,
    aiPerms: AIPermissions
) {
    return filterToolsByPermissionsHelper(tools, aiPerms);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const csrf = validateCsrfOrigin(req);
        if (!csrf.valid) return csrf.response;

        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const agency = await getCurrentAgency();
        if (!agency?.id) {
            return NextResponse.json(
                { error: "Agency context required. Please select an agency and try again." },
                { status: 400 }
            );
        }

        const hasAIAccess = await hasExplicitAIAccessSetting(
            { id: session.userId, role: session.role },
            agency.id
        );
        if (hasAIAccess === false) {
            return NextResponse.json(
                { error: "AI access is disabled for this account." },
                { status: 403 }
            );
        }
        if (await checkTrialExpired(agency)) {
            return NextResponse.json(
                { error: "Trial expired. Please upgrade your plan." },
                { status: 403 }
            );
        }

        const requestBody = (await req.json()) as Partial<SingularityRequestBody>;
        const { history, message, images, documents, mode, isHeavyTask } =
            normalizeSingularityRequestBody(requestBody);
        const authenticatedUserId = session.userId;

        const payloadError = validateSingularityPayloadLimits({ history, message, images, documents });
        if (payloadError) {
            return NextResponse.json(
                { error: payloadError },
                { status: 413 }
            );
        }

        const aiConfig = await getAgencyAIConfigServer();
        if (!aiConfig) {
            return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        let fullPrompt = buildConversationPrompt(history, message);

        if (documents && documents.length > 0) {
            fullPrompt += "\n\n--- UPLOADED DOCUMENTS ---\n";
            for (const doc of documents) {
                fullPrompt += `\nFILE: ${doc.fileName} (${doc.mimeType})\n`;
                if (doc.textContent && !doc.textContent.startsWith("[PDF Document:")) {
                    fullPrompt += `CONTENT:\n${doc.textContent}\n`;
                }
                fullPrompt += "---\n";
            }
        }

        // Resolve config per feature — full isolation (provider, key, model)
        const agentConfig = getResolvedFeatureConfig(aiConfig, "agent");
        const chatConfig  = getResolvedFeatureConfig(aiConfig, "chat");

        // If admin toggled Heavy Tasks mode, override with the heavy model config
        const isAdminHeavy = isHeavyTask && session.role === "admin";
        const heavyConfig = isAdminHeavy ? getResolvedFeatureConfig(aiConfig, "heavyTasks") : null;

        const agentModelId = resolveModel(heavyConfig ?? agentConfig);
        const chatModelId  = resolveModel(heavyConfig ?? chatConfig);

        if (isAdminHeavy) {
            console.log("[Singularity] Heavy Tasks mode active, model:", agentModelId);
        }

        // isLive is checked per mode
        const isLive = mode === "agent"
            ? agentModelId.includes("native-audio")
            : chatModelId.includes("native-audio");

        if (mode === "agent") {
            console.log("[Singularity Agent] Starting agent mode for userId:", authenticatedUserId);

            let systemInstruction = "";
            try {
                systemInstruction = await buildSingularityContext(authenticatedUserId);
                console.log("[Singularity Agent] Context built, length:", systemInstruction.length);
            } catch (contextError: unknown) {
                console.error(
                    "[Singularity Agent] Context build failed:",
                    getErrorMessage(contextError, "Unknown context error")
                );
                systemInstruction =
                    "You are Singularity Agent - an AI assistant for agency management. Agency data could not be loaded.";
            }

            const isLiteModel =
                agentModelId.includes("lite") || agentModelId.includes("flash-lite");
            if (isLiteModel) {
                systemInstruction += `\n\nMODEL-SPECIFIC RULES (you are a lightweight model):
- ALWAYS use bulk tools (bulk_create_tasks, bulk_update_task_status) instead of individual calls for batch operations.
- When moving tasks to Done with realistic dates, use bulk_update_task_status with autoBackdate=true.
- You MUST call a tool to perform an action. Reading data (get_project_tasks) does NOT modify anything.
- If you only see "Fetching tasks" in the Actions, you have NOT updated any tasks.
- When an uploaded file contains many tasks, you MUST call bulk_create_tasks MULTIPLE TIMES until ALL tasks from the file are created. Never stop at a subset.
- Include ~30-40 tasks per bulk_create_tasks call to avoid truncation.
- Keep responses concise. Do not over-explain or repeat yourself.`;
            }

            // Apply DB prompt override if set (full replacement)
            try {
                const promptConfig = await getPromptConfigPublic();
                const featureKey = isLiteModel ? 'agentModeLite' : 'agentMode';
                const overrideConfig = (promptConfig as Record<string, { standard?: string; live?: string } | undefined>)[featureKey];
                const override = isLive ? (overrideConfig?.live || overrideConfig?.standard) : overrideConfig?.standard;
                if (override && override.trim().length > 0) {
                    console.log(`[Singularity Agent] Using DB prompt override for ${featureKey} (${override.length} chars)`);
                    systemInstruction = override;
                }
            } catch (overrideErr) {
                console.warn('[Singularity Agent] Could not load prompt override:', overrideErr);
            }

            const agentPrompt = `${systemInstruction}\n\n---\n\n${fullPrompt}`;

            let filteredTools = SINGULARITY_TOOL_DECLARATIONS;
            try {
                const aiPerms = await getAIPermissions();
                filteredTools = filterToolsByPermissions(
                    SINGULARITY_TOOL_DECLARATIONS,
                    aiPerms
                );
                console.log(
                    `[Singularity Agent] Tools: ${SINGULARITY_TOOL_DECLARATIONS.length} total, ${filteredTools.length} after permission filter`
                );
            } catch (permissionError) {
                console.error(
                    "[Singularity Agent] Failed to filter tools by permissions:",
                    permissionError
                );
            }

            if (!isLive) {
                return handleNonLiveAgentMode({
                    aiConfig: heavyConfig ?? agentConfig,
                    modelId: agentModelId,
                    systemInstruction,
                    fullPrompt,
                    filteredTools,
                    authenticatedUserId,
                    agencyId: agency.id,
                    images,
                    documents,
                });
            }

            return handleLiveAgentMode({
                aiConfig: heavyConfig ?? agentConfig,
                agencyId: agency.id,
                authenticatedUserId,
                modelId: agentModelId,
                systemInstruction,
                fullPrompt,
                agentPrompt,
                filteredTools,
                images,
                documents,
            });
        }

        return handleChatModeRequest({
            aiConfig: heavyConfig ?? chatConfig,
            fullPrompt,
            images,
            documents,
            agencyId: agency.id,
            authenticatedUserId,
            modelId: chatModelId,
        });
    } catch (error: unknown) {
        console.error("[Singularity API] Error:", error);
        return NextResponse.json(
            { error: "An internal error occurred" },
            { status: 500 }
        );
    }
}
