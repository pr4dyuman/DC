import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";

import type { LeaveRequest, LeaveStatus, User } from "../db";
import { dateKeyTz, fmtDate, isDateOnlyString, toLocalCalendarDay, todayStrTz } from "@/lib/date-utils";
import {
    sendLeaveApprovedEmail,
    sendLeaveCancelledEmail,
    sendLeaveRejectedEmail,
    sendLeaveRequestedEmail,
} from "../brevo-mail";
import { ActivityModel, LeaveRequestModel, UserModel, connectDB } from "../mongodb";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeString } from "../validation";
import { isNotifEnabled, sanitizeDoc } from "./shared";
import { createNotification, createNotifications } from "./notification-service";

type LeaveActor = {
    id: string;
    name: string;
    role: string;
    timezone?: string;
};

type LeaveQuery = {
    agencyId: string;
    userId?: string;
};

type LeaveInput = Omit<LeaveRequest, "id" | "status" | "createdAt" | "agencyId">;
type LeaveReviewer = Pick<User, "id" | "email">;

function getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function getLeaveReviewers(agencyId: string, excludeUserId?: string): Promise<LeaveReviewer[]> {
    const query: { agencyId: string; role: { $in: string[] }; id?: { $ne: string } } = {
        agencyId,
        role: { $in: ["admin", "manager"] },
    };
    if (excludeUserId) query.id = { $ne: excludeUserId };
    return UserModel.find(query).select("id email").lean() as Promise<LeaveReviewer[]>;
}

function calculateRequestedDays(startDateIso: string, endDateIso: string) {
    const startDate = new Date(startDateIso);
    const endDate = new Date(endDateIso);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export async function getLeaveRequestsImpl(caller: LeaveActor, agencyId: string, userId?: string) {
    await connectDB();

    const query: LeaveQuery = { agencyId };
    const isPrivileged = caller.role === "admin" || caller.role === "manager";

    if (userId) {
        if (!isPrivileged && caller.id !== userId) {
            throw new Error("Unauthorized: You can only view your own leave requests.");
        }
        query.userId = userId;
    } else if (!isPrivileged) {
        query.userId = caller.id;
    }

    const requests = await LeaveRequestModel.find(query).lean() as LeaveRequest[];
    return requests
        .map((request) => sanitizeDoc(request) as LeaveRequest)
        .sort((a, b) => {
            if (a.status === "Pending" && b.status !== "Pending") return -1;
            if (a.status !== "Pending" && b.status === "Pending") return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
}

export async function requestLeaveImpl(currentUser: LeaveActor, agencyId: string, leaveData: LeaveInput) {
    const nextLeaveData = sanitizeMongoInput(leaveData) as LeaveInput;
    if (nextLeaveData.reason) nextLeaveData.reason = sanitizeString(nextLeaveData.reason, 2000);

    const timezone = currentUser.timezone || "UTC";
    const todayKey = todayStrTz(timezone);
    const startKey = dateKeyTz(nextLeaveData.startDate, timezone);
    const endKey = dateKeyTz(nextLeaveData.endDate, timezone);

    if (!isDateOnlyString(startKey) || !isDateOnlyString(endKey)) {
        throw new Error("Validation Error: Invalid leave dates");
    }

    if (startKey < todayKey) {
        throw new Error("Leave start date cannot be in the past");
    }

    if (endKey < startKey) {
        throw new Error("Leave end date must be after start date");
    }

    const startDate = toLocalCalendarDay(startKey);
    const endDate = toLocalCalendarDay(endKey);
    if (!startDate || !endDate) {
        throw new Error("Validation Error: Invalid leave dates");
    }

    const daysDiff = differenceInCalendarDays(endDate, startDate) + 1;

    if (nextLeaveData.type === "Casual" && daysDiff > 15) {
        throw new Error("Casual leave cannot exceed 15 days. Please split into multiple requests or use Emergency leave.");
    }

    if (nextLeaveData.type === "Emergency" && daysDiff > 7) {
        throw new Error("Emergency leave cannot exceed 7 days. For longer periods, please use Casual leave.");
    }

    const newLeaveRequest: LeaveRequest = {
        ...nextLeaveData,
        id: generateId(),
        userId: currentUser.id,
        status: "Pending",
        createdAt: new Date().toISOString(),
        agencyId,
    };

    await connectDB();
    await LeaveRequestModel.create(newLeaveRequest);

    const reviewers = await getLeaveReviewers(agencyId, currentUser.id);
    if (await isNotifEnabled("leave")) {
        await createNotifications(reviewers.map((reviewer) => ({
            agencyId,
            userId: reviewer.id,
            message: `${currentUser.name} requested ${nextLeaveData.type} leave (${daysDiff} day${daysDiff > 1 ? "s" : ""})`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/team",
            eventKey: `leave-requested:${newLeaveRequest.id}:${reviewer.id}`,
        })));
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: currentUser.name,
        userId: currentUser.id,
        action: "submitted leave request",
        target: `${nextLeaveData.type} leave for ${daysDiff} days`,
        timestamp: new Date().toISOString(),
    });

    try {
        const adminEmails = reviewers.map((reviewer) => reviewer.email).filter(Boolean) as string[];
        if (adminEmails.length > 0) {
            await sendLeaveRequestedEmail({
                adminEmails,
                employeeName: currentUser.name,
                leaveType: nextLeaveData.type,
                startDate: nextLeaveData.startDate,
                endDate: nextLeaveData.endDate,
                days: daysDiff,
                reason: nextLeaveData.reason || "No reason provided",
                teamLink: `${getAppUrl()}/dashboard/team`,
            });
        }
    } catch (error) {
        console.error("[Email] Failed to send leave request email:", error);
    }

    revalidatePath("/dashboard/team");
    return newLeaveRequest;
}

export async function approveLeaveRequestImpl(currentUser: LeaveActor, agencyId: string, leaveRequestId: string) {
    await connectDB();

    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId }).lean() as LeaveRequest | null;
    if (!leaveRequest) throw new Error("Leave request not found");
    if (leaveRequest.status !== "Pending") throw new Error(`Cannot approve ${leaveRequest.status} leave request`);

    await LeaveRequestModel.updateOne(
        { id: leaveRequestId, agencyId },
        { $set: { status: "Approved", reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() } }
    );

    const daysDiff = calculateRequestedDays(leaveRequest.startDate, leaveRequest.endDate);
    const employee = await UserModel.findOne({ id: leaveRequest.userId, agencyId }).select("-password").lean() as Pick<User, "name" | "email"> | null;

    if (employee && await isNotifEnabled("leave")) {
        await createNotification({
            agencyId,
            userId: leaveRequest.userId,
            message: `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? "s" : ""}) has been approved by ${currentUser.name}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/team",
            eventKey: `leave-approved:${leaveRequestId}:${leaveRequest.userId}`,
        });
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: currentUser.name,
        userId: currentUser.id,
        action: "approved leave request",
        target: employee ? `${employee.name}'s ${leaveRequest.type} leave` : "Leave request",
        timestamp: new Date().toISOString(),
    });

    try {
        if (employee?.email) {
            await sendLeaveApprovedEmail({
                employeeEmail: employee.email,
                employeeName: employee.name,
                leaveType: leaveRequest.type,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                days: daysDiff,
                approvedBy: currentUser.name,
                teamLink: `${getAppUrl()}/dashboard/team`,
            });
        }
    } catch (error) {
        console.error("[Email] Failed to send leave approved email:", error);
    }

    revalidatePath("/dashboard/team");
}

export async function rejectLeaveRequestImpl(
    currentUser: LeaveActor,
    agencyId: string,
    leaveRequestId: string,
    rejectionReason?: string
) {
    let nextRejectionReason = rejectionReason;
    if (nextRejectionReason) nextRejectionReason = sanitizeString(nextRejectionReason, 1000);

    await connectDB();
    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId }).lean() as LeaveRequest | null;
    if (!leaveRequest) throw new Error("Leave request not found");
    if (leaveRequest.status !== "Pending") throw new Error(`Cannot reject ${leaveRequest.status} leave request`);

    await LeaveRequestModel.updateOne(
        { id: leaveRequestId, agencyId },
        { $set: { status: "Rejected", reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() } }
    );

    const daysDiff = calculateRequestedDays(leaveRequest.startDate, leaveRequest.endDate);
    const employee = await UserModel.findOne({ id: leaveRequest.userId, agencyId }).select("-password").lean() as Pick<User, "name" | "email"> | null;

    if (employee && await isNotifEnabled("leave")) {
        const message = nextRejectionReason
            ? `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? "s" : ""}) was rejected by ${currentUser.name}. Reason: ${nextRejectionReason}`
            : `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? "s" : ""}) was rejected by ${currentUser.name}`;

        await createNotification({
            agencyId,
            userId: leaveRequest.userId,
            message,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/team",
            eventKey: `leave-rejected:${leaveRequestId}:${leaveRequest.userId}`,
        });
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: currentUser.name,
        userId: currentUser.id,
        action: "rejected leave request",
        target: employee ? `${employee.name}'s ${leaveRequest.type} leave` : "Leave request",
        timestamp: new Date().toISOString(),
    });

    try {
        if (employee?.email) {
            await sendLeaveRejectedEmail({
                employeeEmail: employee.email,
                employeeName: employee.name,
                leaveType: leaveRequest.type,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                days: daysDiff,
                rejectedBy: currentUser.name,
                rejectionReason: nextRejectionReason,
                teamLink: `${getAppUrl()}/dashboard/team`,
            });
        }
    } catch (error) {
        console.error("[Email] Failed to send leave rejected email:", error);
    }

    revalidatePath("/dashboard/team");
}

export async function cancelLeaveRequestImpl(currentUser: LeaveActor, agencyId: string, leaveRequestId: string) {
    let deletedLeaveData: { type: string } | null = null;

    await connectDB();
    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId }).lean() as LeaveRequest | null;
    if (!leaveRequest) throw new Error("Leave request not found");
    if (leaveRequest.userId !== currentUser.id && currentUser.role !== "admin") {
        throw new Error("Unauthorized: You can only cancel your own leave requests");
    }
    if (leaveRequest.status !== "Pending") {
        throw new Error(`Cannot cancel ${leaveRequest.status} leave request. Please contact admin.`);
    }

    deletedLeaveData = { type: leaveRequest.type };
    await LeaveRequestModel.deleteOne({ id: leaveRequestId, agencyId });
    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: currentUser.name,
        userId: currentUser.id,
        action: "cancelled leave request",
        target: `${leaveRequest.type} leave`,
        timestamp: new Date().toISOString(),
    });

    const reviewers = await getLeaveReviewers(agencyId, currentUser.id);
    if (reviewers.length > 0) {
        const owner = leaveRequest.userId === currentUser.id
            ? { name: currentUser.name }
            : await UserModel.findOne({ id: leaveRequest.userId, agencyId }).select("name").lean() as Pick<User, "name"> | null;
        const employeeName = owner?.name || currentUser.name;
        const cancelMessage = leaveRequest.userId === currentUser.id
            ? `${currentUser.name} cancelled their ${leaveRequest.type} leave request`
            : `${currentUser.name} cancelled ${employeeName}'s ${leaveRequest.type} leave request`;

        if (await isNotifEnabled("leave")) {
            await createNotifications(reviewers.map((reviewer) => ({
                agencyId,
                userId: reviewer.id,
                message: cancelMessage,
                read: false,
                timestamp: new Date().toISOString(),
                link: "/dashboard/team",
                eventKey: `leave-cancelled:${leaveRequestId}:${reviewer.id}`,
            })));
        }

        try {
            const adminEmails = reviewers.map((reviewer) => reviewer.email).filter(Boolean) as string[];
            if (adminEmails.length > 0 && deletedLeaveData) {
                await sendLeaveCancelledEmail({
                    adminEmails,
                    employeeName,
                    leaveType: deletedLeaveData.type,
                    teamLink: `${getAppUrl()}/dashboard/team`,
                });
            }
        } catch (error) {
            console.error("[Email] Failed to send leave cancelled email:", error);
        }
    }

    revalidatePath("/dashboard/team");
}

export async function getEmployeeLeaveStatsImpl(userId: string, agencyId: string) {
    await connectDB();

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01`).toISOString();
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59`).toISOString();

    const leaveRequests = await LeaveRequestModel.find({
        userId,
        agencyId,
        createdAt: { $gte: yearStart, $lte: yearEnd },
    }).lean() as LeaveRequest[];

    const approvedLeaves = leaveRequests.filter((leaveRequest) => leaveRequest.status === "Approved");

    let casualDaysTaken = 0;
    let emergencyDaysTaken = 0;

    approvedLeaves.forEach((leaveRequest) => {
        const days = calculateRequestedDays(leaveRequest.startDate, leaveRequest.endDate);
        if (leaveRequest.type === "Casual") {
            casualDaysTaken += days;
        } else if (leaveRequest.type === "Emergency") {
            emergencyDaysTaken += days;
        }
    });

    const casualLeaveAllowance = 15;
    const emergencyLeaveAllowance = 7;

    return {
        casualDaysTaken,
        casualDaysRemaining: Math.max(0, casualLeaveAllowance - casualDaysTaken),
        emergencyDaysTaken,
        emergencyDaysRemaining: Math.max(0, emergencyLeaveAllowance - emergencyDaysTaken),
        pendingRequests: leaveRequests.filter((leaveRequest) => leaveRequest.status === "Pending").length,
        approvedRequests: approvedLeaves.length,
        rejectedRequests: leaveRequests.filter((leaveRequest) => leaveRequest.status === "Rejected").length,
    };
}

export async function updateLeaveStatusImpl(
    currentUser: LeaveActor,
    agencyId: string,
    requestId: string,
    status: LeaveStatus
) {
    await connectDB();

    const request = await LeaveRequestModel.findOne({ id: requestId, agencyId }).lean() as LeaveRequest | null;
    if (!request) throw new Error("Request not found");
    if (request.status !== "Pending") throw new Error("Only pending requests can be updated");

    await LeaveRequestModel.updateOne(
        { id: requestId, agencyId },
        { $set: { status, reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() } }
    );

    const userDoc = await UserModel.findOne({ id: request.userId, agencyId }).select("-password").lean() as Pick<User, "username"> | null;
    if (await isNotifEnabled("leave")) {
        await createNotification({
            agencyId,
            userId: request.userId,
            message: `Your leave request for ${fmtDate(request.startDate, "UTC", "en-US")} has been ${status}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/team/${userDoc?.username || request.userId}?tab=leaves`,
            eventKey: `leave-status:${requestId}:${status}:${request.userId}`,
        });
    }

    revalidatePath("/dashboard/team");
}
