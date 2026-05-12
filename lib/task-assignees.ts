type TaskAssigneeFields = {
    assigneeId?: string | null;
    assigneeIds?: string[] | null;
};

function cleanAssigneeId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeTaskAssigneeIds(
    assigneeIds?: unknown,
    fallbackAssigneeId?: unknown,
): string[] {
    const ids = Array.isArray(assigneeIds)
        ? assigneeIds.map(cleanAssigneeId)
        : [];
    const fallback = cleanAssigneeId(fallbackAssigneeId);
    if (fallback) ids.push(fallback);

    return [...new Set(ids.filter(Boolean))];
}

export function getTaskAssigneeIds(task: TaskAssigneeFields | null | undefined): string[] {
    if (!task) return [];
    return normalizeTaskAssigneeIds(task.assigneeIds, task.assigneeId);
}

export function getPrimaryTaskAssigneeId(taskOrIds: TaskAssigneeFields | string[] | null | undefined): string {
    const ids = Array.isArray(taskOrIds) ? normalizeTaskAssigneeIds(taskOrIds) : getTaskAssigneeIds(taskOrIds);
    return ids[0] || "";
}

export function isTaskAssignedTo(task: TaskAssigneeFields | null | undefined, userId: string): boolean {
    return !!userId && getTaskAssigneeIds(task).includes(userId);
}

export function areTaskAssigneeIdsEqual(first: string[], second: string[]): boolean {
    const firstIds = normalizeTaskAssigneeIds(first).sort();
    const secondIds = normalizeTaskAssigneeIds(second).sort();
    return firstIds.length === secondIds.length && firstIds.every((id, index) => id === secondIds[index]);
}

export function buildTaskAssigneeUpdate(assigneeIds: unknown, fallbackAssigneeId?: unknown) {
    const normalizedAssigneeIds = normalizeTaskAssigneeIds(assigneeIds, fallbackAssigneeId);
    return {
        assigneeIds: normalizedAssigneeIds,
        assigneeId: getPrimaryTaskAssigneeId(normalizedAssigneeIds),
    };
}
