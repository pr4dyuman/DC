import "server-only";

import type { Agency, Task, User } from "../db";
import { ProjectModel, UserModel } from "../mongodb";

export type TaskMutationActor = Pick<User, "id" | "name">;
export type TaskMutationUser = TaskMutationActor & {
    role: User["role"] | "superadmin";
};
export type EmailCategorySettings = NonNullable<Agency["settings"]["emailCategories"]>;
export type CommentAgencyContext = Pick<Agency, "id" | "settings">;
export type TaskEffectRecord = Omit<Task, "assigneeId" | "assigneeIds"> & {
    assigneeId?: string;
    assigneeIds?: string[];
};
export type TaskEffectArgs = {
    previousTask: TaskEffectRecord;
    currentTask: TaskEffectRecord;
    agency: Pick<Agency, "id" | "settings">;
    userName: string;
    userId: string;
    completedAt?: string;
};

export function getEmailCategories(agency: CommentAgencyContext): Partial<EmailCategorySettings> {
    return agency.settings?.emailCategories || {};
}

export async function getAgencyUser(agencyId: string, userId: string) {
    return UserModel.findOne({ id: userId, agencyId })
        .select("id name email")
        .lean() as Promise<Pick<User, "id" | "name" | "email"> | null>;
}

export async function getProjectSummary(agencyId: string, projectId: string) {
    return ProjectModel.findOne({ id: projectId, agencyId })
        .select("id name clientId slug status")
        .lean() as Promise<{ id: string; name: string; clientId?: string; slug?: string; status?: string } | null>;
}
