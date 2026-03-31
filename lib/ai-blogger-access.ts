import type { AgencyPlan, AgencyStatus } from "@/lib/types";

export type AIBloggerAccessReason =
    | "ok"
    | "client"
    | "role"
    | "trial"
    | "plan"
    | "inactive"
    | "feature";

type AIBloggerAccessInput = {
    role?: string | null;
    plan?: AgencyPlan | null;
    status?: AgencyStatus | null;
    featureEnabled?: boolean | null;
};

export type AIBloggerAccessState = {
    canAccess: boolean;
    showInSidebar: boolean;
    isLocked: boolean;
    reason: AIBloggerAccessReason;
    badgeLabel: string | null;
};

export function getAIBloggerAccessState({
    role,
    plan,
    status,
    featureEnabled,
}: AIBloggerAccessInput): AIBloggerAccessState {
    const isAdmin = role === "admin";
    const showInSidebar = isAdmin;

    if (role === "client") {
        return {
            canAccess: false,
            showInSidebar: false,
            isLocked: true,
            reason: "client",
            badgeLabel: null,
        };
    }

    if (!isAdmin) {
        return {
            canAccess: false,
            showInSidebar: false,
            isLocked: true,
            reason: "role",
            badgeLabel: null,
        };
    }

    if (status === "trial") {
        return {
            canAccess: false,
            showInSidebar,
            isLocked: true,
            reason: "trial",
            badgeLabel: "Pro",
        };
    }

    if (status === "suspended" || status === "cancelled") {
        return {
            canAccess: false,
            showInSidebar,
            isLocked: true,
            reason: "inactive",
            badgeLabel: "Locked",
        };
    }

    const isPaidPlan = plan === "pro" || plan === "enterprise";

    if (!isPaidPlan) {
        return {
            canAccess: false,
            showInSidebar,
            isLocked: true,
            reason: "plan",
            badgeLabel: "Pro",
        };
    }

    if (featureEnabled === false) {
        return {
            canAccess: false,
            showInSidebar,
            isLocked: true,
            reason: "feature",
            badgeLabel: "Disabled",
        };
    }

    return {
        canAccess: true,
        showInSidebar,
        isLocked: false,
        reason: "ok",
        badgeLabel: null,
    };
}
