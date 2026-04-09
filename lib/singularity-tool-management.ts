import {
    addService,
    approveLeaveRequest,
    bulkEstimateTaskHours,
    createClient,
    getUser,
    rejectLeaveRequest,
    updateClient,
    updateService,
    updateUser,
} from "./actions";
import { ClientModel } from "./mongodb";
import { getRequiredAgencyId } from "./singularity-tool-project-task-shared";
import type { Client, User } from "./types";

type ToolArgs = Record<string, unknown>;
type RollbackAction = {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: "task" | "project" | "client" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
    entityId: string;
    beforeSnapshot?: unknown;
    createdEntityIds?: string[];
    executedAt: string;
};
type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: RollbackAction[];
};
type SnapshotEntityType = "client" | "service" | "leaveRequest";
type SnapshotEntity = (entityType: SnapshotEntityType, entityId: string) => Promise<unknown>;
type ManagementToolName =
    | "create_client"
    | "update_client"
    | "update_employee"
    | "manage_leave_request"
    | "add_service"
    | "update_service"
    | "bulk_estimate_hours";

function getOptionalStringArg(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

function getStringArg(args: ToolArgs, key: string): string {
    return getOptionalStringArg(args, key) ?? "";
}

function getNumberArg(args: ToolArgs, key: string): number | undefined {
    const value = args[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArrayArg(args: ToolArgs, key: string): string[] {
    const value = args[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function executeManagementTool(
    name: ManagementToolName,
    args: ToolArgs,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "create_client": {
            const result = await createClient({
                name: getStringArg(args, "name"),
                email: getStringArg(args, "email"),
                companyName: getStringArg(args, "companyName"),
                phone: getOptionalStringArg(args, "phone"),
                address: getOptionalStringArg(args, "address"),
                logo: getOptionalStringArg(args, "logo"),
            });

            if (!result.success) {
                return { success: false, data: null, summary: `Failed to create client: ${result.error}` };
            }

            const newClient = result.data;
            const createdAt = getOptionalStringArg(args, "createdAt");
            if (createdAt) {
                const agencyId = await getRequiredAgencyId();
                await ClientModel.updateOne(
                    { id: newClient.id, agencyId },
                    { $set: { createdAt: new Date(createdAt).toISOString() } },
                    { timestamps: false }
                );
            }

            return {
                success: true,
                data: { id: newClient.id, name: newClient.name, companyName: newClient.companyName },
                summary: `Client "${newClient.name}" (${newClient.companyName}) created${createdAt ? ` (backdated: ${createdAt})` : ""}`,
                rollbackData: [{
                    toolName: "create_client",
                    actionType: "create",
                    entityType: "client",
                    entityId: newClient.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "update_client": {
            const clientId = getStringArg(args, "clientId");
            const clientUpdates: Partial<Pick<Client, "name" | "email" | "companyName" | "phone" | "address" | "logo">> = {};
            const nameValue = getOptionalStringArg(args, "name");
            const emailValue = getOptionalStringArg(args, "email");
            const companyNameValue = getOptionalStringArg(args, "companyName");
            const phoneValue = getOptionalStringArg(args, "phone");
            const addressValue = getOptionalStringArg(args, "address");
            const logoValue = getOptionalStringArg(args, "logo");
            if (nameValue) clientUpdates.name = nameValue;
            if (emailValue) clientUpdates.email = emailValue;
            if (companyNameValue) clientUpdates.companyName = companyNameValue;
            if (phoneValue) clientUpdates.phone = phoneValue;
            if (addressValue) clientUpdates.address = addressValue;
            if (logoValue) clientUpdates.logo = logoValue;

            const clientSnapshot = await snapshotEntity("client", clientId);
            await updateClient(clientId, clientUpdates);

            return {
                success: true,
                data: { clientId, updates: clientUpdates },
                summary: `Client updated — changed: ${Object.keys(clientUpdates).join(", ")}`,
                rollbackData: clientSnapshot ? [{
                    toolName: "update_client",
                    actionType: "update",
                    entityType: "client",
                    entityId: clientId,
                    beforeSnapshot: clientSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "update_employee": {
            const userId = getStringArg(args, "userId");
            const empUpdates: Partial<User> & { phone?: string } = {};
            const nameValue = getOptionalStringArg(args, "name");
            const emailValue = getOptionalStringArg(args, "email");
            const jobTitleValue = getOptionalStringArg(args, "jobTitle");
            const roleValue = getOptionalStringArg(args, "role");
            const phoneValue = getOptionalStringArg(args, "phone");
            const salaryValue = getNumberArg(args, "salary");
            if (nameValue) empUpdates.name = nameValue;
            if (emailValue) empUpdates.email = emailValue;
            if (jobTitleValue) empUpdates.jobTitle = jobTitleValue;
            if (roleValue) empUpdates.role = roleValue as User["role"];
            if (salaryValue !== undefined) empUpdates.salary = salaryValue;
            if (phoneValue) empUpdates.phone = phoneValue;

            const empBefore = await getUser(userId).catch(() => null);
            await updateUser(userId, empUpdates);
            const empName = await getUser(userId).catch(() => null);

            return {
                success: true,
                data: { userId, updates: empUpdates },
                summary: `${empName?.name || "Employee"} updated — changed: ${Object.keys(empUpdates).join(", ")}`,
                rollbackData: empBefore ? [{
                    toolName: "update_employee",
                    actionType: "update",
                    entityType: "task",
                    entityId: userId,
                    beforeSnapshot: empBefore,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "manage_leave_request": {
            const leaveRequestId = getStringArg(args, "leaveRequestId");
            const action = getStringArg(args, "action");
            const reason = getStringArg(args, "reason");
            const leaveSnapshot = await snapshotEntity("leaveRequest", leaveRequestId);

            if (action === "approve") {
                await approveLeaveRequest(leaveRequestId);
                return {
                    success: true,
                    data: { leaveRequestId, action: "approved" },
                    summary: "Leave request approved ✅",
                    rollbackData: leaveSnapshot ? [{
                        toolName: "manage_leave_request",
                        actionType: "update",
                        entityType: "leaveRequest",
                        entityId: leaveRequestId,
                        beforeSnapshot: leaveSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            await rejectLeaveRequest(leaveRequestId, reason);
            return {
                success: true,
                data: { leaveRequestId, action: "rejected", reason },
                summary: `Leave request rejected ❌${reason ? ` — Reason: ${reason}` : ""}`,
                rollbackData: leaveSnapshot ? [{
                    toolName: "manage_leave_request",
                    actionType: "update",
                    entityType: "leaveRequest",
                    entityId: leaveRequestId,
                    beforeSnapshot: leaveSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "add_service": {
            const newService = await addService(
                getStringArg(args, "name"),
                getStringArg(args, "projectId"),
                getStringArrayArg(args, "employees")
            );

            return {
                success: true,
                data: { id: newService.id, name: newService.name, projectId: getStringArg(args, "projectId") },
                summary: `Service "${newService.name}" added to project`,
                rollbackData: [{
                    toolName: "add_service",
                    actionType: "create",
                    entityType: "service",
                    entityId: newService.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "update_service": {
            const serviceId = getStringArg(args, "serviceId");
            const serviceName = getStringArg(args, "name");
            const projectId = getStringArg(args, "projectId");
            const employees = getStringArrayArg(args, "employees");
            const serviceSnapshot = await snapshotEntity("service", serviceId);

            await updateService(serviceId, serviceName, projectId, employees);

            return {
                success: true,
                data: { serviceId, name: serviceName },
                summary: `Service updated to "${serviceName}"`,
                rollbackData: serviceSnapshot ? [{
                    toolName: "update_service",
                    actionType: "update",
                    entityType: "service",
                    entityId: serviceId,
                    beforeSnapshot: serviceSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "bulk_estimate_hours": {
            const result = await bulkEstimateTaskHours();
            return {
                success: true,
                data: result,
                summary: result.message,
            };
        }
    }
}
