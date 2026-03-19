import "server-only";

import type { Agency, Client, Project, User } from "../db";
import { ClientModel, ProjectModel } from "../mongodb";

export type FinanceActor = Pick<User, "id" | "name"> & {
    role: User["role"] | "superadmin";
};

export type AgencyContext = Pick<Agency, "id" | "name">;

export type RefundInput = {
    projectId: string;
    amount: number;
    description: string;
    refundReason: string;
    originalTransactionId?: string;
    date: string;
};

export async function getClientDoc(agencyId: string, clientId: string) {
    return ClientModel.findOne({ id: clientId, agencyId }).select("-password").lean() as Promise<Client | null>;
}

export async function getProjectDoc(agencyId: string, projectId: string) {
    return ProjectModel.findOne({ id: projectId, agencyId }).lean() as Promise<Project | null>;
}
