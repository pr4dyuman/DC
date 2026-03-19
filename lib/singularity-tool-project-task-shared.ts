type RollbackEntityType =
    | "task"
    | "project"
    | "client"
    | "invoice"
    | "transaction"
    | "service"
    | "leaveRequest"
    | "comment";

export type ToolArgs = Record<string, unknown>;

export type RollbackAction = {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: RollbackEntityType;
    entityId: string;
    beforeSnapshot?: unknown;
    createdEntityIds?: string[];
    executedAt: string;
};

export type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: RollbackAction[];
};

export type SnapshotEntityType = "task" | "project";

export type SnapshotEntity = (entityType: SnapshotEntityType, entityId: string) => Promise<unknown>;

export function getOptionalStringArg(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value !== "" ? value : undefined;
}

export function getStringArg(args: ToolArgs, key: string): string {
    return getOptionalStringArg(args, key) ?? "";
}

export function getOptionalNumberArg(args: ToolArgs, key: string): number | undefined {
    const value = args[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getNumberArg(args: ToolArgs, key: string): number {
    return getOptionalNumberArg(args, key) ?? 0;
}

export function getBooleanArg(args: ToolArgs, key: string): boolean {
    return args[key] === true;
}

export function getStringArrayArg(args: ToolArgs, key: string): string[] {
    const value = args[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function getRecordArg(args: ToolArgs, key: string): Record<string, unknown> | null {
    const value = args[key];
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

export async function getRequiredAgencyId(): Promise<string> {
    const { getCurrentAgency } = await import("./agency-context");
    const agency = await getCurrentAgency();
    if (!agency?.id) {
        throw new Error("Agency context required");
    }
    return agency.id;
}
