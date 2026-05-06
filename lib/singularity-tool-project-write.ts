import {
    createProject,
    updateProject,
} from "./actions";
import { syncProjectBudgetImpl } from "./actions/project-mutations";
import type { ProjectLike } from "./actions/projects-shared";
import { getRequiredAgencyId as getAgencyId } from "./singularity-tool-project-task-shared";
import { ProjectModel } from "./mongodb";
import {
    getNumberArg,
    getRequiredAgencyId,
    getOptionalNumberArg,
    getOptionalStringArg,
    getStringArg,
    getStringArrayArg,
    type SnapshotEntity,
    type ToolArgs,
    type ToolExecutionResult,
} from "./singularity-tool-project-task-shared";
import type { Project } from "./types";

export type ProjectWriteToolName =
    | "create_project"
    | "update_project";

export async function executeProjectWriteTool(
    name: ProjectWriteToolName,
    args: ToolArgs,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "create_project": {
            const newProject = await createProject({
                name: getStringArg(args, "name"),
                budget: getNumberArg(args, "budget"),
                dueDate: getOptionalStringArg(args, "dueDate") || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
                clientId: getOptionalStringArg(args, "clientId"),
                clientIds: getStringArrayArg(args, "clientIds"),
                client: undefined,
                services: getStringArrayArg(args, "services"),
            } as Parameters<typeof createProject>[0]);

            const status = getOptionalStringArg(args, "status");
            const createdAt = getOptionalStringArg(args, "createdAt");
            if (status || createdAt) {
                const updates: Partial<Pick<Project, "status" | "createdAt">> = {};
                if (status) updates.status = status as Project["status"];
                if (createdAt) updates.createdAt = new Date(createdAt).toISOString();
                if (createdAt) {
                    const agencyId = await getRequiredAgencyId();
                    await ProjectModel.updateOne(
                        { id: newProject.id, agencyId },
                        { $set: updates },
                        { timestamps: false }
                    );
                } else {
                    await updateProject(newProject.id, updates);
                }
            }

            const statusLabel = status || "Active";
            return {
                success: true,
                data: { id: newProject.id, name: newProject.name, slug: newProject.slug, status: statusLabel },
                summary: `Project "${newProject.name}" created (${statusLabel}${createdAt ? `, started: ${createdAt}` : ""}). You can now use bulk_create_tasks with projectId: ${newProject.id}`,
                rollbackData: [{
                    toolName: "create_project",
                    actionType: "create",
                    entityType: "project",
                    entityId: newProject.id,
                    beforeSnapshot: { agencyId: newProject.agencyId },
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "update_project": {
            const projectId = getStringArg(args, "projectId");
            const projUpdates: Partial<ProjectLike> = {};
            const nameValue = getOptionalStringArg(args, "name");
            const descriptionValue = getOptionalStringArg(args, "description");
            const budgetValue = getOptionalNumberArg(args, "budget");
            const dueDateValue = getOptionalStringArg(args, "dueDate");
            const statusValue = getOptionalStringArg(args, "status");
            const servicesValue = getStringArrayArg(args, "services");
            if (nameValue) projUpdates.name = nameValue;
            if (descriptionValue) projUpdates.description = descriptionValue;
            if (budgetValue !== undefined) projUpdates.budget = budgetValue;
            if (dueDateValue) projUpdates.dueDate = dueDateValue;
            if (statusValue) projUpdates.status = statusValue as Project["status"];
            if (servicesValue.length > 0) projUpdates.services = servicesValue;

            const projTimestamps: Partial<Pick<Project, "createdAt">> = {};
            const createdAt = getOptionalStringArg(args, "createdAt");
            if (createdAt) projTimestamps.createdAt = new Date(createdAt).toISOString();

            if (Object.keys(projUpdates).length === 0 && Object.keys(projTimestamps).length === 0) {
                return { success: false, data: null, summary: "No changes specified" };
            }

            const projSnapshot = await snapshotEntity("project", projectId);
            if (Object.keys(projUpdates).length > 0) {
                await updateProject(projectId, projUpdates);
            }
            // When budget changes, distribute it across services so the card + finance stay in sync
            if (budgetValue !== undefined) {
                try {
                    const agencyId = await getAgencyId();
                    await syncProjectBudgetImpl(projectId, budgetValue, agencyId);
                } catch (budgetErr) {
                    console.warn("[update_project] Could not sync budget across services:", budgetErr);
                }
            }
            if (Object.keys(projTimestamps).length > 0) {
                const agencyId = await getRequiredAgencyId();
                await ProjectModel.updateOne(
                    { id: projectId, agencyId },
                    { $set: projTimestamps },
                    { timestamps: false }
                );
            }

            const changedFields = [...Object.keys(projUpdates), ...Object.keys(projTimestamps)].join(", ");
            return {
                success: true,
                data: { projectId, updates: projUpdates },
                summary: `Project updated - changed: ${changedFields}`,
                rollbackData: projSnapshot ? [{
                    toolName: "update_project",
                    actionType: "update",
                    entityType: "project",
                    entityId: projectId,
                    beforeSnapshot: projSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }
    }
}
