import { executeProjectWriteTool, type ProjectWriteToolName } from "./singularity-tool-project-write";
import { executeProjectTaskBulkTool, type ProjectTaskBulkToolName } from "./singularity-tool-project-task-bulk";
import { executeTaskWriteTool, type TaskWriteToolName } from "./singularity-tool-task-write";
import {
    type SnapshotEntity,
    type ToolArgs,
    type ToolExecutionResult,
} from "./singularity-tool-project-task-shared";

export type ProjectTaskToolName =
    | ProjectWriteToolName
    | TaskWriteToolName
    | ProjectTaskBulkToolName;

export async function executeProjectTaskTool(
    name: ProjectTaskToolName,
    args: ToolArgs,
    userId: string,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "create_project":
        case "update_project":
            return executeProjectWriteTool(name, args, snapshotEntity);

        case "create_task":
        case "update_task_status":
        case "edit_task":
        case "reassign_task":
        case "delete_task":
        case "add_task_comment":
            return executeTaskWriteTool(name, args, userId, snapshotEntity);

        case "bulk_update_task_status":
        case "bulk_edit_tasks":
        case "bulk_create_tasks":
            return executeProjectTaskBulkTool(name, args, userId, snapshotEntity);
    }
}
