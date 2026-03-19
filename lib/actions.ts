"use server";

import { User, Invoice, Task, Notification, Activity, Client, Asset, PaymentConfig, LeaveRequest, LeaveStatus, UserPermissions, Transaction } from "./db";
import type { AIConfig, AIPermissions } from "./types";
import { getCurrentAgency } from "./agency-context";
import { resolveUserOrClient } from "./utils-server";
import { sanitizeMongoInput } from "./validation";
import {
    getAllClientsImpl,
    getAllUsersImpl,
    getSuperAdminsImpl,
} from "./actions/admin-queries";
import {
    deleteProjectImpl,
    permanentlyDeleteClientImpl,
    permanentlyDeleteUserImpl,
    verifyAdminPasswordImpl,
} from "./actions/admin-deletions";
import {
    bulkEstimateTaskHoursImpl,
} from "./actions/ai-estimation";
import {
    type ExtractedTaskFields,
} from "./actions/ai-task";
import {
    type ChatMessage,
} from "./actions/ai-task-chat";
import {
    canCurrentUserAccessProject,
    getCurrentUserImpl,
    getScopedProjectIdsForCurrentUser,
    requireAuth,
    requireRole,
    toActionActor,
} from "./actions/access";
import {
    aiEstimateTaskHoursAction,
    chatWithTaskAIAction,
    closeAISessionAction,
    createAISessionAction,
    enhanceTaskDescriptionAction,
    explainTaskAction,
    extractTaskFieldsAction,
    sendAIMessageAction,
    singularityChatAction,
} from "./actions/ai-runtime";
import {
    getAgencyAIConfigImpl,
    getAgencySettingsImpl,
    getAIPermissionsImpl,
    updateAIPermissionsImpl,
    updateAgencyDetailsImpl,
    updateEmailCategorySettingsImpl,
    updateEmailSettingsImpl,
    updateTaskEmailEventsImpl,
    updateUserPermissionsImpl,
    verifyAgentPasswordImpl,
} from "./actions/agency-settings";
import {
    addProjectAssetImpl,
    deleteProjectAssetImpl,
    getProjectAssetsImpl,
    toggleAssetAIImpl,
    updateProjectAssetImpl,
} from "./actions/assets";
import {
    getClientByIdImpl,
    getClientByUsernameImpl,
    getClientProjectsImpl,
    getClientsImpl,
} from "./actions/client-queries";
import {
    createClientImpl,
    deleteClientImpl,
    getArchivedClientsImpl,
    unarchiveClientImpl,
    updateClientImpl,
} from "./actions/client-mutations";
import {
    getDashboardMetricsImpl,
    getEmployeeDashboardDataImpl,
    getAgencyDashboardSettingsImpl,
    getClientDashboardDataImpl,
    getNotificationsImpl,
    getProjectDistributionImpl,
    getRecentActivityImpl,
    getRevenueDataImpl,
    getUnreadNotificationCountImpl,
    getUrgentTasksImpl,
    markNotificationAsReadImpl,
    updateAgencyDashboardSettingsImpl,
} from "./actions/dashboard";
import {
    getCategoryMemberSummaryImpl,
    getClientActivityLogsImpl,
    getClientFinanceDataImpl,
    getClientFinancialSummaryImpl,
    getFinanceChartDataImpl,
    getFinanceStatsImpl,
    getInvoicesImpl,
    getPayrollStatusImpl,
    getProjectRefundsImpl,
    getTransactionsImpl,
} from "./actions/finance-queries";
import {
    adminApproveInvoicePaymentImpl,
    adminRejectInvoicePaymentImpl,
    clientMarkInvoiceAsPaidImpl,
    createInvoiceImpl,
    createRefundImpl,
    createTransactionImpl,
    deleteTransactionImpl,
    markTransactionAsPaidImpl,
    payEmployeeImpl,
    updateInvoiceStatusImpl,
    verifyAdminPasswordForDeletionImpl,
} from "./actions/finance-mutations";
import { type ProjectLike } from "./actions/projects-shared";
import {
    getClientCreatedTasksImpl,
    getProjectBySlugImpl,
    getProjectDirectoryUsersImpl,
    getProjectImpl,
    getProjectTasksImpl,
    getProjectsImpl,
    getUserProjectsImpl,
} from "./actions/project-queries";
import {
    createProjectImpl,
    updateProjectPaymentImpl,
    updateProjectImpl,
} from "./actions/project-mutations";
import { globalSearchImpl, type SearchResult as SearchActionResult } from "./actions/search";
import {
    getProjectServicesImpl,
    getServicesImpl,
    getServiceTaskCountImpl,
} from "./actions/service-queries";
import {
    addServiceImpl,
    deleteServiceImpl,
    updateServiceImpl,
} from "./actions/service-mutations";
import {
    getAllProjectTasksImpl,
    getHighPriorityTasksImpl,
    getTaskByIdImpl,
    getTasksImpl,
    getUserPermissionsImpl,
} from "./actions/task-queries";
import {
    addCommentImpl,
    createTaskImpl,
    deleteTaskImpl,
    updateTaskImpl,
    updateTaskStatusImpl,
} from "./actions/task-mutations";
import {
    deleteUserImpl,
    getArchivedUsersImpl,
    unarchiveUserImpl,
} from "./actions/user-lifecycle";
import {
    adminResetPasswordImpl,
    approveDocumentUpdateImpl,
    createUserImpl,
    updateUserImpl,
    updateUserTimezoneImpl,
} from "./actions/user-mutations";
import {
    getUserActivityImpl,
    getUserByUsernameImpl,
    getUserContributionHistoryImpl,
    getUserImpl,
    getUsersImpl,
    getUserTasksImpl,
} from "./actions/user-queries";
import {
    approveLeaveRequestImpl,
    cancelLeaveRequestImpl,
    getEmployeeLeaveStatsImpl,
    getLeaveRequestsImpl,
    rejectLeaveRequestImpl,
    requestLeaveImpl,
    updateLeaveStatusImpl,
} from "./actions/leave";
import { requireAgencyFilter } from "./actions/shared";

// Authentication
import { connectDB } from "./mongodb";
import { getSessionUser } from "@/lib/auth";
import { getSessionId as authGetSessionId, login as authLogin, logout as authLogout } from "@/lib/auth";

export async function getAgencySettings() {
    await requireAuth();
    const agency = await getCurrentAgency();
    return getAgencySettingsImpl(agency);
}

// Get the AI config for the current user's agency -- API key is masked (safe for client)
export async function getAgencyAIConfig(): Promise<AIConfig | null> {
    await requireAuth();
    return getAgencyAIConfigImpl();
}

// Get AI permissions for the current agency (what Singularity is allowed to do)
export async function getAIPermissions(): Promise<AIPermissions> {
    await requireAuth();
    const agency = await getCurrentAgency();
    return getAIPermissionsImpl(agency);
}

// Update AI permissions -- admin only
export async function updateAIPermissions(permissions: AIPermissions) {
    await requireRole('admin');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    return updateAIPermissionsImpl(permissions, agency.id);
}

// Verify password before allowing AI agent tool calls
export async function verifyAgentPassword(password: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await requireAuth();
    return verifyAgentPasswordImpl(password, currentUser.id);
}

export async function updateEmailSettings(enabled: boolean) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    return updateEmailSettingsImpl(enabled, agency.id);
}

export async function updateEmailCategorySettings(categories: Record<string, boolean>) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    return updateEmailCategorySettingsImpl(categories, agency.id);
}

export async function updateTaskEmailEvents(events: Record<string, Record<string, boolean>>) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    return updateTaskEmailEventsImpl(events, agency.id);
}

export async function updateAgencyDetails(name: string, logo: string, primaryColor?: string, secondaryColor?: string) {
    await requireRole('admin');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    return updateAgencyDetailsImpl(name, logo, agency.id, primaryColor, secondaryColor);
}

// Re-export auth functions for backward compatibility
export const getSessionId = authGetSessionId;
export const login = authLogin;
export const logout = authLogout;

export async function getAllUsers() {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getAllUsersImpl(agencyFilter.agencyId);
}

export async function getAllClients() {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getAllClientsImpl(agencyFilter.agencyId);
}

export async function getSuperAdmins() {
    await requireRole('admin');
    return getSuperAdminsImpl();
}

export type SearchResult = SearchActionResult;
export type { CurrentUserResult } from "./actions/access";
type TaskEffectRecord = Omit<Task, 'assigneeId'> & {
    assigneeId?: string;
};

async function getAccessibleTaskOrThrow(taskId: string, agencyId: string) {
    const task = await getTaskByIdImpl(agencyId, taskId);
    if (!task) {
        throw new Error("Task not found");
    }

    const canAccess = await canCurrentUserAccessProject(task.projectId, agencyId);
    if (!canAccess) {
        throw new Error("Unauthorized: You cannot access this task.");
    }

    return task;
}

export async function getDashboardMetrics() {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getDashboardMetricsImpl(agency.id, currentUser.timezone);
}

export async function getRevenueData() {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getRevenueDataImpl(agency.id);
}

export async function getProjectDistribution() {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getProjectDistributionImpl(agency.id);
}

export async function getRecentActivity(offset = 0, limit = 5): Promise<Activity[]> {
    const currentUser = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getRecentActivityImpl(toActionActor(currentUser), agency.id, offset, limit);
}

export async function getUrgentTasks(limit = 5) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getUrgentTasksImpl(agency.id, limit);
}

export async function getClientDashboardData(clientId: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientDashboardDataImpl(toActionActor(caller), clientId, agency.id);
}

export async function getEmployeeDashboardData(userId: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getEmployeeDashboardDataImpl(toActionActor(caller), userId, agency.id);
}

// Auto-clear notifications older than 30 days
export async function getNotifications(userId: string, offset = 0, limit = 50): Promise<Notification[]> {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getNotificationsImpl(toActionActor(caller), agency.id, userId, offset, limit);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getUnreadNotificationCountImpl(toActionActor(caller), agency.id, userId);
}


export async function getProjects(offset = 0, limit = 1000) {
    const currentUserId = await getSessionId();
    if (!currentUserId) return []; // Require auth

    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const currentUser = await resolveUserOrClient(currentUserId, agencyFilter.agencyId);
    if (!currentUser) return [];

    const scopedProjectIds = currentUser.role === 'employee'
        ? await getScopedProjectIdsForCurrentUser(agencyFilter.agencyId)
        : null;

    return getProjectsImpl(
        agencyFilter.agencyId,
        { id: currentUser.id, role: currentUser.role },
        offset,
        limit,
        scopedProjectIds
    );
}

export async function getUserProjects(userId: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getUserProjectsImpl(agencyFilter.agencyId, userId);
}

export async function getProject(id: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const project = await getProjectImpl(agencyFilter.agencyId, id);
    if (!project) return undefined;
    const canAccess = await canCurrentUserAccessProject(project.id, agencyFilter.agencyId);
    if (!canAccess) return undefined;
    return project;
}

export async function getProjectBySlug(slug: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const project = await getProjectBySlugImpl(agencyFilter.agencyId, slug);
    if (!project) return undefined;
    const canAccess = await canCurrentUserAccessProject(project.id, agencyFilter.agencyId);
    if (!canAccess) return undefined;
    return project;
}

export async function getProjectDirectoryUsers(projectId: string) {
    await requireAuth();

    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');

    const canAccess = await canCurrentUserAccessProject(projectId, agency.id);
    if (!canAccess) {
        throw new Error('Unauthorized: You cannot access this project.');
    }

    return getProjectDirectoryUsersImpl(agency.id, projectId, await getSessionId());
}

export async function getUsers() {
    const currentUserId = await getSessionId();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const currentUser = currentUserId
        ? await resolveUserOrClient(currentUserId, agencyFilter.agencyId)
        : null;
    return getUsersImpl(
        currentUser ? { id: currentUser.id, role: currentUser.role } : null,
        agencyFilter.agencyId
    );
}

export async function getUser(id: string) {
    const agency = await getCurrentAgency();
    const agencyId = agency?.id;
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await resolveUserOrClient(currentUserId, agencyId);
    return getUserImpl(
        currentUser ? { id: currentUser.id, role: currentUser.role } : null,
        agencyId,
        id
    );
}


export async function getUserByUsername(username: string) {
    const agency = await getCurrentAgency();
    const agencyId = agency?.id;
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await resolveUserOrClient(currentUserId, agencyId);
    return getUserByUsernameImpl(
        currentUser ? { id: currentUser.id, role: currentUser.role } : null,
        agencyId,
        username
    );
}

export async function getUserTasks(userId: string, offset = 0, limit = 1000) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own tasks
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own tasks.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getUserTasksImpl(agencyFilter.agencyId, userId, offset, limit);
}

// For Client Profile: Get projects they OWN
export async function getClientProjects(clientId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — clients can only access their own projects
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientProjectsImpl(toActionActor(caller), agency.id, clientId);
}

export async function getProjectTasks(projectIds: string[]) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const requestedProjectIds = Array.from(new Set((projectIds || []).filter(Boolean)));
    if (requestedProjectIds.length === 0) return [];

    const scopedProjectIds = await getScopedProjectIdsForCurrentUser(agencyFilter.agencyId);
    const allowedProjectIds = scopedProjectIds === null
        ? requestedProjectIds
        : requestedProjectIds.filter((projectId) => scopedProjectIds.includes(projectId));
    if (allowedProjectIds.length === 0) return [];

    return getProjectTasksImpl(agencyFilter.agencyId, allowedProjectIds);
}

// For Client Profile: Get tasks they CREATED (Assigned to others)
export async function getClientCreatedTasks(userId: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const isPrivileged = caller.role === "admin" || caller.role === "manager";
    if (!isPrivileged && caller.id !== userId) {
        throw new Error("Unauthorized: You can only view your own created tasks.");
    }
    return getClientCreatedTasksImpl(agencyFilter.agencyId, userId);
}

export async function getUserActivity(userId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own activity
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own activity.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getUserActivityImpl(agencyFilter.agencyId, userId);
}

export async function getUserContributionHistory(userId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own contributions
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own contribution history.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getUserContributionHistoryImpl(agencyFilter.agencyId, userId);
}

export async function createUser(user: Omit<User, "id" | "agencyId">) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    return createUserImpl(user, agency);
}

export async function getCurrentUser() {
    return getCurrentUserImpl();
}

export async function updateUserTimezone(timezone: string) {
    "use server";
    const session = await getSessionUser();
    return updateUserTimezoneImpl(
        timezone,
        session ? { userId: session.userId, role: session.role as User["role"] | "superadmin" } : null
    );
}

export async function updateUser(id: string, updates: Partial<User>, oldPassword?: string) {
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    return updateUserImpl(
        id,
        updates,
        currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null,
        agency,
        oldPassword
    );
}

export async function deleteClient(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error('Unauthorized');
    }
    const agency = await getCurrentAgency();
    return deleteClientImpl(id, agency?.id);
}

export async function getArchivedClients() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized');
    const agency = await getCurrentAgency();
    return getArchivedClientsImpl(agency?.id);
}

export async function unarchiveClient(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized");
    }
    const agency = await getCurrentAgency();
    return unarchiveClientImpl(id, agency?.id);
}

export async function permanentlyDeleteClient(id: string, password: string) {
    await requireRole('admin');
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return permanentlyDeleteClientImpl(id, agency.id);
}

export async function approveDocumentUpdate(userId: string, type: 'adhar' | 'pan' | 'contracts' | 'other' | 'both', approve: boolean) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized");
    }
    const agency = await getCurrentAgency();
    return approveDocumentUpdateImpl(userId, type, approve, agency?.id);
}

export async function adminResetPassword(id: string, newPassword: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can reset passwords.");
    }
    const agency = await getCurrentAgency();
    return adminResetPasswordImpl(
        id,
        newPassword,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        agency?.id
    );
}

export async function deleteUser(id: string, password: string) {
    await requireRole('admin');
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();
    return deleteUserImpl(id, agency?.id);
}

export async function getArchivedUsers() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized');
    const agency = await getCurrentAgency();
    return getArchivedUsersImpl(agency?.id);
}

export async function unarchiveUser(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Unauthorized');
    }
    const agency = await getCurrentAgency();
    return unarchiveUserImpl(id, agency?.id);
}

export async function permanentlyDeleteUser(id: string, password: string) {
    await requireRole('admin');
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return permanentlyDeleteUserImpl(id, agency.id);
}

export async function getServices() {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const scopedProjectIds = await getScopedProjectIdsForCurrentUser(agencyFilter.agencyId);
    return getServicesImpl(agencyFilter.agencyId, scopedProjectIds);
}

export async function addService(name: string, projectId: string, employees: string[]) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    return addServiceImpl(name, projectId, employees, agency?.id);
}

export async function deleteService(id: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    return deleteServiceImpl(id, agency?.id);
}

export async function updateService(id: string, name: string, projectId: string, employees: string[]) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    return updateServiceImpl(id, name, projectId, employees, agency?.id);

    // Get old name before updating — needed to propagate rename
}

export async function getProjectServices(projectId: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const canAccess = await canCurrentUserAccessProject(projectId, agencyFilter.agencyId);
    if (!canAccess) throw new Error('Unauthorized: You cannot access this project.');
    return getProjectServicesImpl(agencyFilter.agencyId, projectId);
}

export async function getServiceTaskCount(projectId: string, serviceName: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getServiceTaskCountImpl(agency.id, projectId, serviceName);
}

export async function createProject(project: Omit<ProjectLike, "id" | "status" | "createdAt" | "agencyId">) {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('No agency context');
    return createProjectImpl(
        project,
        { id: currentUser.id, name: currentUser.name },
        agency.id
    );
}

export async function updateProjectPayment(projectId: string, serviceId: string, paymentConfig: PaymentConfig) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateProjectPaymentImpl(projectId, serviceId, paymentConfig, agency.id);
}

export async function getTasks(projectId: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const canAccess = await canCurrentUserAccessProject(projectId, agency.id);
    if (!canAccess) throw new Error('Unauthorized: You cannot access this project.');
    return getTasksImpl(agency.id, projectId);
}

export async function getTaskById(taskId: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getAccessibleTaskOrThrow(taskId, agencyFilter.agencyId);
}

/** Lightweight: fetch all tasks for every project in the agency (for list-page progress bars) */
export async function getAllProjectTasks() {
    await requireAuth();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const scopedProjectIds = await getScopedProjectIdsForCurrentUser(agencyFilter.agencyId);
    return getAllProjectTasksImpl(agencyFilter.agencyId, scopedProjectIds);
}


export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    const caller = await requireAuth();
    const isPrivileged = caller.role === "admin" || caller.role === "manager";
    if (!isPrivileged && caller.id !== userId) {
        throw new Error("Unauthorized: You can only view your own permissions.");
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getUserPermissionsImpl(agencyFilter.agencyId, userId);
}

export async function updateUserPermissions(targetUserId: string, permissions: UserPermissions) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can manage permissions.");
    }
    // Prevent NoSQL injection via key path manipulation
    if (!/^[a-zA-Z0-9_-]+$/.test(targetUserId)) {
        throw new Error('Invalid user ID format');
    }
    // Sanitize permissions object
    permissions = sanitizeMongoInput(permissions);

    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateUserPermissionsImpl(agency.id, targetUserId, permissions);
}

export async function deleteTask(taskId: string) {
    const currentUser = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    await getAccessibleTaskOrThrow(taskId, agency.id);
    const permissions = await getUserPermissions(currentUser.id);
    return deleteTaskImpl(
        taskId,
        agency.id,
        { id: currentUser.id, name: currentUser.name },
        permissions.deleteAccess
    );
}

export async function updateTaskStatus(taskId: string, status: Task['status'], completedAt?: string) {
    const currentUser = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    await getAccessibleTaskOrThrow(taskId, agency.id);
    const permissions = await getUserPermissions(currentUser.id);
    return updateTaskStatusImpl(
        taskId,
        status,
        completedAt,
        { id: agency.id, settings: agency.settings },
        { id: currentUser.id, name: currentUser.name },
        permissions
    );
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
    const currentUser = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const task = await getAccessibleTaskOrThrow(taskId, agency.id);
    if (updates.projectId && updates.projectId !== task.projectId) {
        const canAccessTargetProject = await canCurrentUserAccessProject(updates.projectId, agency.id);
        if (!canAccessTargetProject) {
            throw new Error('Unauthorized: You cannot move this task into that project.');
        }
    }
    const permissions = await getUserPermissions(currentUser.id);
    return updateTaskImpl(
        taskId,
        updates,
        { id: agency.id, settings: agency.settings },
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        permissions
    );
}

export async function addComment(taskId: string, userId: string, text: string, timestamp?: string) {
    const currentUser = await requireAuth();
    // Verify userId matches the authenticated user to prevent spoofing
    if (userId !== currentUser.id) {
        throw new Error('Unauthorized: You can only post comments as yourself.');
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    await getAccessibleTaskOrThrow(taskId, agency.id);
    return addCommentImpl(taskId, userId, text, { id: agency.id, settings: agency.settings }, timestamp);
}


export async function createTask(task: Omit<TaskEffectRecord, "id" | "agencyId">) {
    await requireRole('admin', 'manager');
    const currentUser = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return createTaskImpl(task, { id: agency.id, settings: agency.settings }, { id: currentUser.id, name: currentUser.name });
}


// --- Client Actions ---

export async function getClients() {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientsImpl(agency.id);
}

export async function getClientByUsername(username: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientByUsernameImpl(toActionActor(caller), agency.id, username);
}

export async function getClientById(id: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientByIdImpl(agency.id, id);
}

export async function createClient(client: Omit<Client, "id" | "agencyId">) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can create clients.");
    }
    const agencyCtx = await getCurrentAgency();
    return createClientImpl(client, agencyCtx ? { id: agencyCtx.id, name: agencyCtx.name } : null);
}

export async function updateClient(id: string, updates: Partial<Client>) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error('Unauthorized');
    }
    const agency = await getCurrentAgency();
    return updateClientImpl(id, updates, agency?.id);
}




// Project Actions
export async function updateProject(id: string, updates: Partial<ProjectLike>) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateProjectImpl(id, updates, agency.id);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return false;
    return verifyAdminPasswordImpl(currentUser.id, password);
}

export async function deleteProject(id: string, password: string) {
    await requireRole('admin');
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return deleteProjectImpl(id, agency.id);
}

// ----------------------------------------------------------------------
// Finance Actions
// ----------------------------------------------------------------------


export async function getTransactions(projectId?: string, userId?: string, category?: string) {
    const caller = await requireAuth();
    if (caller.role === 'employee') {
        throw new Error('Unauthorized: Employees cannot access transaction data.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getTransactionsImpl(agencyFilter.agencyId, toActionActor(caller), { projectId, userId, category });
}

export async function getClientFinanceData(clientId: string) {
    const caller = await requireAuth();
    if (caller.role === 'client' && caller.id !== clientId) {
        throw new Error('Unauthorized: You can only view your own client finance data.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getClientFinanceDataImpl(agencyFilter.agencyId, clientId);
}

export async function getClientActivityLogs(clientId: string, limit = 20) {
    const caller = await requireAuth();
    if (caller.role === 'client' && caller.id !== clientId) {
        throw new Error('Unauthorized: You can only view your own client activity.');
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getClientActivityLogsImpl(agency.id, clientId, limit);
}

export async function getCategoryMemberSummary(category: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getCategoryMemberSummaryImpl(agencyFilter.agencyId, category);
}


export async function createTransaction(transaction: Omit<Transaction, "id" | "status" | "agencyId"> & { status?: Transaction['status'] }) {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return createTransactionImpl(
        transaction,
        { id: agency.id, name: agency.name },
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
}

export async function markTransactionAsPaid(transactionId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can mark transactions as paid.");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return markTransactionAsPaidImpl(transactionId, agency.id);
}


export async function getInvoices(projectId?: string) {
    const caller = await requireAuth();
    if (caller.role === 'employee') {
        throw new Error('Unauthorized: Employees cannot access invoice data.');
    }
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getInvoicesImpl(agencyFilter.agencyId, toActionActor(caller), projectId);
}

// Client marks invoice as paid (moves to Processing status)
export async function clientMarkInvoiceAsPaid(invoiceId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'client') throw new Error('Unauthorized: Only clients can mark invoices as paid');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return clientMarkInvoiceAsPaidImpl(
        invoiceId,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        agency.id
    );
}

// Admin approves payment (moves to Paid status and creates transaction)
export async function adminApproveInvoicePayment(invoiceId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized: Only admins can approve payments');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return adminApproveInvoicePaymentImpl(invoiceId, agency.id);
}

// Admin rejects payment (moves back to Pending status)
export async function adminRejectInvoicePayment(invoiceId: string, reason?: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized: Only admins can reject payments');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return adminRejectInvoicePaymentImpl(invoiceId, agency.id, reason);
}

// Legacy function - kept for backward compatibility
export async function updateInvoiceStatus(invoiceId: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Processing') {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateInvoiceStatusImpl(invoiceId, agency.id, status);
}

export async function deleteTransaction(transactionId: string, password: string) {
    const currentUser = await requireRole('admin');

    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    await verifyAdminPasswordForDeletionImpl(currentUser.id, password);
    return deleteTransactionImpl(transactionId, agency.id);
}

export async function getHighPriorityTasks(offset = 0, limit = 5) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getHighPriorityTasksImpl(agencyFilter.agencyId, offset, limit);
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "status" | "agencyId">) {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');
    return createInvoiceImpl(
        invoice,
        { id: agency.id, name: agency.name },
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
}

export async function getFinanceStats(projectId?: string, userId?: string, category?: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getFinanceStatsImpl(agencyFilter.agencyId, { projectId, userId, category });
}

export async function getFinanceChartData(projectId?: string, userId?: string, category?: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getFinanceChartDataImpl(agencyFilter.agencyId, { projectId, userId, category });
}

export async function getPayrollStatus(userId?: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getPayrollStatusImpl(agencyFilter.agencyId, userId);
}

export async function payEmployee(userId: string, amount: number, month: string, userName: string) {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return payEmployeeImpl(
        userId,
        amount,
        month,
        userName,
        { id: agency.id, name: agency.name },
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
}

export async function getAgencyDashboardSettings() {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getAgencyDashboardSettingsImpl(agency.id);
}

export async function updateAgencyDashboardSettings(settings: { systemName: string; logo: string }) {
    await requireRole('admin');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateAgencyDashboardSettingsImpl(agency.id, settings);
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const scopedProjectIds =
        caller.role === "admin" || caller.role === "manager" || caller.role === "superadmin"
            ? null
            : await getScopedProjectIdsForCurrentUser(agency.id);
    return globalSearchImpl(query, agency.id, scopedProjectIds);
}


export async function markNotificationAsRead(id: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    // S5 fix: IDOR protection — only allow marking own notifications (or admin/manager)
    if (!agency?.id) throw new Error('Agency context required');
    return markNotificationAsReadImpl(toActionActor(caller), agency.id, id);
}

// ----------------------------------------------------------------------
// Asset Actions
// ----------------------------------------------------------------------

export async function getProjectAssets(projectId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const canAccess = await canCurrentUserAccessProject(projectId, agency.id);
    if (!canAccess) throw new Error('Unauthorized: You cannot access this project.');
    return getProjectAssetsImpl(projectId, agency.id);
}

export async function addProjectAsset(asset: Omit<Asset, "id" | "uploadedAt" | "agencyId" | "uploadedBy">) {
    const caller = await requireRole('admin', 'manager', 'employee');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const canAccess = await canCurrentUserAccessProject(asset.projectId, agency.id);
    if (!canAccess) {
        throw new Error('Unauthorized: You cannot access this project.');
    }
    return addProjectAssetImpl(asset, agency.id, { id: caller.id, name: caller.name });
}

export async function deleteProjectAsset(assetId: string) {
    await requireRole('admin', 'manager');
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return deleteProjectAssetImpl(assetId, agency.id, currentUser ? { id: currentUser.id, name: currentUser.name } : null);
}

export async function updateProjectAsset(assetId: string, updates: Partial<Asset>) {
    await requireRole('admin', 'manager');
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateProjectAssetImpl(
        assetId,
        updates,
        agency.id,
        currentUser ? { id: currentUser.id, name: currentUser.name } : null
    );
}

export async function toggleAssetAI(assetId: string, enabled: boolean) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return toggleAssetAIImpl(assetId, enabled, agency.id);
}

export type { ExtractedTaskFields } from "./actions/ai-task";

/**
 * Extract structured task fields from an AI response text.
 * The AI parses the message and returns best-fit values for title, description, category, priority.
 */
export async function extractTaskFields(
    aiResponseText: string,
    availableCategories: string[],
): Promise<ExtractedTaskFields> {
    return extractTaskFieldsAction(aiResponseText, availableCategories);
}

export async function explainTask(taskId: string, userId: string) {
    return explainTaskAction(taskId, userId);
}

export async function enhanceTaskDescription(projectId: string, title: string, content: string, userId: string) {
    return enhanceTaskDescriptionAction(projectId, title, content, userId);
}

export type { ChatMessage } from "./actions/ai-task-chat";

// ============================================================================
// AI CHAT SESSION MANAGEMENT (Persistent Live API Sessions)
// ============================================================================

/**
 * Create a persistent AI chat session.
 * Returns a sessionId that can be used for subsequent messages.
 */
export async function createAISession(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    userId: string
): Promise<string> {
    return createAISessionAction(projectId, currentTitle, currentDescription, userId);
}

/**
 * Send a message to an existing AI chat session.
 * For Live API models, uses persistent session (fast, no reconnect).
 * For legacy models, falls back to full context + history send.
 */
export async function sendAIMessage(
    sessionId: string,
    userMessage: string,
    // Legacy fallback params
    projectId?: string,
    currentTitle?: string,
    currentDescription?: string,
    history?: ChatMessage[],
    userId?: string
): Promise<string> {
    return sendAIMessageAction(sessionId, userMessage, projectId, currentTitle, currentDescription, history, userId);
}

/**
 * Close an AI chat session when the chat box is closed.
 */
export async function closeAISession(sessionId: string): Promise<void> {
    return closeAISessionAction(sessionId);
}

/**
 * Legacy chat function -- used as fallback for non-Live models.
 * Sends full context + history each time.
 */
export async function chatWithTaskAI(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    history: ChatMessage[],
    userMessage: string,
    userId: string
) {
    return chatWithTaskAIAction(projectId, currentTitle, currentDescription, history, userMessage, userId);
}

// ============================================================================
// SINGULARITY -- Standalone AI Chatbot (No system prompt)
// ============================================================================

export async function singularityChat(
    history: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string
): Promise<{ response: string; thinking: string }> {
    return singularityChatAction(history, userMessage);
}

// ----------------------------------------------------------------------
// Leave Management Actions
// ----------------------------------------------------------------------



export async function getLeaveRequests(userId?: string) {
    const caller = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    // S4 fix: IDOR protection — non-admin users can only see their own leave requests
    return getLeaveRequestsImpl(toActionActor(caller), agency.id, userId);
}

// Employee submits a leave request
export async function requestLeave(leaveData: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'agencyId'>) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Unauthorized: You must be logged in to submit leave requests");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return requestLeaveImpl(toActionActor(currentUser), agency.id, leaveData);
}

// Admin approves a leave request
export async function approveLeaveRequest(leaveRequestId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can approve leave requests");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return approveLeaveRequestImpl(toActionActor(currentUser), agency.id, leaveRequestId);
}

// Admin rejects a leave request
export async function rejectLeaveRequest(leaveRequestId: string, rejectionReason?: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can reject leave requests");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return rejectLeaveRequestImpl(toActionActor(currentUser), agency.id, leaveRequestId, rejectionReason);
}

// Employee cancels their own pending leave request
export async function cancelLeaveRequest(leaveRequestId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Unauthorized: You must be logged in");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return cancelLeaveRequestImpl(toActionActor(currentUser), agency.id, leaveRequestId);
}

// Get leave statistics for an employee
export async function getEmployeeLeaveStats(userId: string) {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getEmployeeLeaveStatsImpl(userId, agency.id);
}


export async function updateLeaveStatus(requestId: string, status: LeaveStatus) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only admins can update leave status.");
    }
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return updateLeaveStatusImpl(toActionActor(currentUser), agency.id, requestId, status);
}
// Refund Management Functions

export async function createRefund(refund: {
    projectId: string;
    amount: number;
    description: string;
    refundReason: string;
    originalTransactionId?: string;
    date: string;
}) {
    const currentUser = await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return createRefundImpl(
        refund,
        { id: agency.id, name: agency.name },
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
}

export async function getClientFinancialSummary(clientId: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    return getClientFinancialSummaryImpl(agencyFilter.agencyId, clientId);
}

export async function getProjectRefunds(projectId: string) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return getProjectRefundsImpl(agency.id, projectId);
}

// ============================================
// BULK ESTIMATE TASK HOURS
// ============================================
export async function bulkEstimateTaskHours() {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    return bulkEstimateTaskHoursImpl(agency.id);
}

// ============================================
// AI-POWERED TASK HOUR ESTIMATION
// ============================================
export async function aiEstimateTaskHours(
    projectId: string,
    title: string,
    description: string,
    priority: string
): Promise<number> {
    return aiEstimateTaskHoursAction(projectId, title, description, priority);
}
