import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
    ActivityModel,
    AgencyModel,
    AIUsageLogModel,
    AssetModel,
    ClientModel,
    connectDB,
    InvoiceModel,
    LeaveRequestModel,
    MessageModel,
    NotificationModel,
    ProjectModel,
    ServiceModel,
    SettingsModel,
    SingularityChatSessionModel,
    SingularityCheckpointModel,
    SuperAdminModel,
    TaskModel,
    TransactionModel,
    UserModel,
} from "../mongodb";
import { AGENCY_PLANS, Agency } from "../types";
import { sanitizeName, sanitizeString, sanitizeUpdates } from "../validation";
import { logSystemEventImpl } from "./super-admin-ops";
import {
    type AgencyLookupRecord,
    type AgencyPlanUpdate,
    type AssetUrlRecord,
    getSuperAdminAlertSettings,
    sendSuperAdminAlertEmail,
    type SuperAdminPasswordRecord,
    verifySuperAdmin,
} from "./super-admin-shared";

export async function updateAgencyImpl(agencyId: string, updates: Partial<Agency>) {
    await verifySuperAdmin();
    await connectDB();

    updates = sanitizeUpdates(updates) as Partial<Agency>;
    if (updates.name) updates.name = sanitizeName(updates.name, 200);

    const result = await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                ...updates,
                updatedAt: new Date().toISOString(),
            },
        },
    );

    if (result.modifiedCount === 0) {
        throw new Error("Agency not found or no changes made");
    }

    revalidatePath("/super-admin/agencies");
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

export async function suspendAgencyImpl(agencyId: string, password: string, reason?: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    if (reason) reason = sanitizeString(reason, 1000);

    if (!password) throw new Error("Password is required to suspend an agency");
    const superAdmin = await SuperAdminModel.findOne({ id: sa.userId }).select("password").lean() as SuperAdminPasswordRecord | null;
    if (!superAdmin?.password || !(await bcrypt.compare(password, superAdmin.password))) {
        throw new Error("Invalid password");
    }

    const agency = await AgencyModel.findOne({ id: agencyId }).lean() as Agency | null;
    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: "suspended",
                suspendedAt: new Date().toISOString(),
                suspensionReason: reason,
                updatedAt: new Date().toISOString(),
            },
        },
    );

    await logSystemEventImpl({
        event: "Agency Suspended",
        type: "agency",
        detail: `${agency?.name || agencyId} was suspended${reason ? `: ${reason}` : ""}`,
        status: "warning",
        agencyId,
        userId: sa.userId,
    });

    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const agencyName = agency?.name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Suspended: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ""}
            <p><strong>Suspended at:</strong> ${new Date().toLocaleDateString()}</p>`,
        );
    }

    revalidatePath("/super-admin/agencies");
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

export async function activateAgencyImpl(agencyId: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean() as Agency | null;
    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: "active",
                updatedAt: new Date().toISOString(),
            },
            $unset: {
                suspendedAt: "",
                suspensionReason: "",
            },
        },
    );

    await logSystemEventImpl({
        event: "Agency Activated",
        type: "agency",
        detail: `${agency?.name || agencyId} was activated`,
        status: "success",
        agencyId,
        userId: sa.userId,
    });

    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const agencyName = agency?.name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Activated: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            <p><strong>Activated at:</strong> ${new Date().toLocaleDateString()}</p>`,
        );
    }

    revalidatePath("/super-admin/agencies");
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

export async function deleteAgencyImpl(agencyId: string, password: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    const superAdmin = await SuperAdminModel.findOne({ id: sa.userId }).lean();
    if (!superAdmin || !superAdmin.password) {
        throw new Error("Super admin account not found or has no password set");
    }
    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
        throw new Error("Invalid password — agency deletion requires correct super-admin password");
    }

    const agency = await AgencyModel.findOne({ id: agencyId }).lean() as Agency | null;
    if (!agency) throw new Error("Agency not found");

    try {
        const assets = await AssetModel.find({ agencyId }).select("url").lean() as AssetUrlRecord[];
        if (assets.length > 0) {
            const { deleteFile } = await import("@/lib/storage");
            const batchSize = 10;
            for (let i = 0; i < assets.length; i += batchSize) {
                const batch = assets.slice(i, i + batchSize);
                await Promise.allSettled(
                    batch.map((asset) => asset.url ? deleteFile(asset.url) : Promise.resolve()),
                );
            }
            console.log(`[deleteAgency] Cleaned up ${assets.length} files from storage for agency ${agencyId}`);
        }
    } catch (storageErr) {
        console.error("[deleteAgency] Storage cleanup error (proceeding with DB deletion):", storageErr);
    }

    await Promise.all([
        AgencyModel.deleteOne({ id: agencyId }),
        UserModel.deleteMany({ agencyId }),
        ClientModel.deleteMany({ agencyId }),
        ProjectModel.deleteMany({ agencyId }),
        TaskModel.deleteMany({ agencyId }),
        InvoiceModel.deleteMany({ agencyId }),
        TransactionModel.deleteMany({ agencyId }),
        AssetModel.deleteMany({ agencyId }),
        ActivityModel.deleteMany({ agencyId }),
        NotificationModel.deleteMany({ agencyId }),
        ServiceModel.deleteMany({ agencyId }),
        SettingsModel.deleteMany({ agencyId }),
        LeaveRequestModel.deleteMany({ agencyId }),
        MessageModel.deleteMany({ agencyId }),
        SingularityChatSessionModel.deleteMany({ agencyId }),
        SingularityCheckpointModel.deleteMany({ agencyId }),
        AIUsageLogModel.deleteMany({ agencyId }),
    ]);

    await logSystemEventImpl({
        event: "Agency Deleted",
        type: "agency",
        detail: `${agency.name} was permanently deleted`,
        status: "error",
        agencyId,
        userId: sa.userId,
    });

    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const agencyName = agency.name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Deleted: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            <p><strong>Deleted at:</strong> ${new Date().toLocaleDateString()}</p>
            <p>All agency data has been permanently removed.</p>`,
        );
    }

    revalidatePath("/super-admin/agencies");

    return true;
}

export async function updateAgencyPlanImpl(
    agencyId: string,
    plan: "free" | "starter" | "pro" | "enterprise",
    duration: "monthly" | "3months" | "6months" | "yearly" | "lifetime" = "lifetime",
) {
    await verifySuperAdmin();
    await connectDB();

    const planDefaults = AGENCY_PLANS[plan];

    let planExpiresAt: string | undefined;
    if (duration !== "lifetime") {
        const now = new Date();
        const durationMap: Record<string, number> = {
            monthly: 1,
            "3months": 3,
            "6months": 6,
            yearly: 12,
        };
        const months = durationMap[duration] || 1;
        now.setMonth(now.getMonth() + months);
        planExpiresAt = now.toISOString();
    }

    const updateFields: AgencyPlanUpdate = {
        plan,
        limits: planDefaults.limits,
        features: planDefaults.features,
        planDuration: duration,
        updatedAt: new Date().toISOString(),
    };

    if (plan !== "free") {
        updateFields.status = "active";
    }

    if (planExpiresAt) {
        updateFields.planExpiresAt = planExpiresAt;
    }

    const unsetFields: Partial<Record<"planExpiresAt" | "trialEndsAt", "">> = {};
    if (!planExpiresAt) {
        unsetFields.planExpiresAt = "";
    }
    if (plan !== "free") {
        unsetFields.trialEndsAt = "";
    }

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: updateFields,
            ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
        },
    );

    revalidatePath("/super-admin/agencies");
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

export async function extendTrialImpl(agencyId: string, days: number) {
    const sa = await verifySuperAdmin();
    await connectDB();

    if (!days || days < 1 || days > 365) {
        throw new Error("Days must be between 1 and 365");
    }

    const agency = await AgencyModel.findOne({ id: agencyId }).lean() as AgencyLookupRecord | null;
    if (!agency) throw new Error("Agency not found");

    const currentEnd = agency.trialEndsAt ? new Date(agency.trialEndsAt) : new Date();
    const base = currentEnd < new Date() ? new Date() : currentEnd;
    base.setDate(base.getDate() + days);

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: "trial",
                trialEndsAt: base.toISOString(),
                updatedAt: new Date().toISOString(),
            },
        },
    );

    await logSystemEventImpl({
        event: "Trial Extended",
        type: "agency",
        detail: `${agency.name || agencyId} trial extended by ${days} days (new end: ${base.toLocaleDateString()})`,
        status: "info",
        agencyId,
        userId: sa.userId,
    });

    revalidatePath("/super-admin/agencies");
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}
