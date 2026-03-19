import "server-only";

import { revalidatePath } from "next/cache";
import type { Agency, Client, User } from "../db";
import { checkAgencyLimit, incrementAgencyUsage, withAgencyId } from "../agency-context";
import { comparePassword, hashPassword } from "../auth";
import { sendEmployeeAccountCreatedEmail } from "../brevo-mail";
import { generateId } from "../utils-server";
import {
    sanitizeMongoInput,
    sanitizeName,
    sanitizePhone,
    sanitizeUpdates,
    sanitizeUsername,
    validateEmail,
} from "../validation";
import {
    ClientModel,
    NotificationModel,
    SuperAdminModel,
    UserModel,
    connectDB,
} from "../mongodb";
import {
    isNotifEnabled,
    requireAgencyFilter,
    validatePasswordWithPolicy,
} from "./shared";

type UserMutationCaller = Pick<User, "id" | "name"> & {
    role: User["role"] | "superadmin";
};

type DocumentUpdateType = "adhar" | "pan" | "contracts" | "other" | "both";

type UserSession = {
    userId: string;
    role: User["role"] | "superadmin";
};

export async function createUserImpl(user: Omit<User, "id" | "agencyId">, agency: Agency | null) {
    user = sanitizeMongoInput(user);
    user.name = sanitizeName(user.name);
    if (!user.name) throw new Error("Name is required");
    if (user.email) user.email = validateEmail(user.email);
    if (user.contactNumber) user.contactNumber = sanitizePhone(user.contactNumber);
    if (user.password) await validatePasswordWithPolicy(user.password);
    if (user.jobTitle) user.jobTitle = sanitizeName(user.jobTitle, 100);
    const validGenders = ["Male", "Female", "Other"];
    if (user.gender && !validGenders.includes(user.gender)) user.gender = "Male";

    let username = user.username ? sanitizeUsername(user.username) : "";
    if (!username) {
        username = user.name.toLowerCase().replace(/\s+/g, "");
    }

    await connectDB();

    if (agency) {
        const limit = await checkAgencyLimit(agency.id, "users");
        if (!limit.allowed) {
            throw new Error(`Plan limit reached: your plan allows ${limit.limit} users (currently ${limit.current}).`);
        }
    }

    const agencyFilter = requireAgencyFilter(agency);
    let uniqueUsername = username;
    let counter = 1;
    while (
        await UserModel.exists({ username: uniqueUsername, ...agencyFilter }) ||
        await ClientModel.exists({ username: uniqueUsername, ...agencyFilter })
    ) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    const newUser = await withAgencyId({ ...user, id: generateId(), username: uniqueUsername });
    if (!newUser.avatar) {
        newUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`;
    }
    if (newUser.password) {
        newUser.password = await hashPassword(newUser.password);
    }
    if (newUser.createdAt && !Number.isNaN(new Date(newUser.createdAt).getTime())) {
        newUser.createdAt = new Date(newUser.createdAt).toISOString();
    } else {
        newUser.createdAt = new Date().toISOString();
    }

    await connectDB();
    try {
        await UserModel.create(newUser);
        if (agency) await incrementAgencyUsage(agency.id, "users");
    } catch (err: unknown) {
        const writeError = err as { code?: number; keyPattern?: { username?: number } };
        if (writeError?.code === 11000 && writeError?.keyPattern?.username) {
            let retryUsername = uniqueUsername;
            let retryCounter = counter;
            for (let i = 0; i < 5; i++) {
                retryUsername = `${username}${retryCounter}`;
                retryCounter++;
                newUser.username = retryUsername;
                try {
                    await UserModel.create(newUser);
                    break;
                } catch (retryErr: unknown) {
                    const retryWriteError = retryErr as { code?: number };
                    if (retryWriteError?.code !== 11000 || i === 4) throw retryErr;
                }
            }
        } else {
            throw err;
        }
    }

    try {
        if (newUser.email) {
            await sendEmployeeAccountCreatedEmail({
                employeeEmail: newUser.email,
                employeeName: newUser.name,
                username: newUser.username,
                role: newUser.role,
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
                agencyName: agency?.name || "Agency",
            });
        }
    } catch (emailError) {
        console.error("[Email] Failed to send employee account creation email:", emailError);
    }

    try {
        if (await isNotifEnabled("welcome")) {
            await NotificationModel.create({
                id: generateId(),
                agencyId: agency?.id,
                userId: newUser.id,
                message: `Welcome to the team, ${newUser.name}! Your account has been set up. Explore your dashboard to get started.`,
                read: false,
                timestamp: new Date().toISOString(),
                link: "/dashboard",
            });
        }
    } catch (notifError) {
        console.error("[Notification] Failed to create welcome notification:", notifError);
    }

    revalidatePath("/dashboard/team");
    return newUser;
}

export async function updateUserTimezoneImpl(timezone: string, session: UserSession | null) {
    await connectDB();
    if (!session || !timezone) return;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
        return;
    }

    if (session.role === "client") {
        await ClientModel.updateOne({ id: session.userId }, { $set: { timezone } });
    } else if (session.role === "superadmin") {
        await SuperAdminModel.updateOne({ id: session.userId }, { $set: { timezone } });
    } else {
        await UserModel.updateOne({ id: session.userId }, { $set: { timezone } });
    }
}

export async function updateUserImpl(
    id: string,
    updates: Partial<User>,
    caller: UserMutationCaller | null,
    agency: Agency | null,
    oldPassword?: string
) {
    if (!caller) throw new Error("Unauthorized");

    const isAdmin = caller.role === "admin" || caller.role === "manager";
    const isSelf = caller.id === id;

    if (!isAdmin && !isSelf) {
        throw new Error("Unauthorized: You can only edit your own profile.");
    }

    if (!isAdmin) {
        delete updates.role;
        delete updates.salary;
        delete updates.employmentType;
    }

    updates = sanitizeUpdates(updates) as Partial<User>;
    if (updates.name) updates.name = sanitizeName(updates.name);
    if (updates.email) updates.email = validateEmail(updates.email);
    if (updates.contactNumber) updates.contactNumber = sanitizePhone(updates.contactNumber);
    if (updates.username) updates.username = sanitizeUsername(updates.username);
    if (updates.jobTitle) updates.jobTitle = sanitizeName(updates.jobTitle, 100);
    const validGenders = ["Male", "Female", "Other"];
    if (updates.gender && !validGenders.includes(updates.gender)) updates.gender = "Male";

    if (updates.password) {
        if (!oldPassword) {
            throw new Error("Old password is required to change password");
        }

        await connectDB();

        const agencyScope = agency?.id ? { agencyId: agency.id } : {};

        const scopedUser = await UserModel.findOne({ id, ...agencyScope }).select("password").lean() as Pick<User, "password"> | null;
        const scopedClient = scopedUser
            ? null
            : await ClientModel.findOne({ id, ...agencyScope }).select("password").lean() as Pick<Client, "password"> | null;

        const superAdmin = (!scopedUser && !scopedClient && isSelf)
            ? await SuperAdminModel.findOne({ id }).select("password").lean() as { password?: string } | null
            : null;
        const passwordHolder = scopedUser || scopedClient || superAdmin;

        if (!passwordHolder) {
            throw new Error("User not found");
        }
        if (passwordHolder.password) {
            const isMatch = await comparePassword(oldPassword, passwordHolder.password);
            if (!isMatch) {
                throw new Error("Incorrect old password");
            }
        }

        updates.password = await hashPassword(updates.password);

        if (scopedUser) {
            await UserModel.findOneAndUpdate({ id, ...agencyScope }, { $set: updates });
        } else if (scopedClient) {
            await ClientModel.findOneAndUpdate({ id, ...agencyScope }, { $set: updates });
        } else {
            await SuperAdminModel.findOneAndUpdate({ id }, { $set: updates });
        }
        return;
    }

    await connectDB();

    if (updates.username) {
        const agencyFilter = requireAgencyFilter(agency);
        const existingUser = await UserModel.findOne({ username: updates.username, id: { $ne: id }, ...agencyFilter });
        const existingClient = await ClientModel.findOne({ username: updates.username, id: { $ne: id }, ...agencyFilter });

        if (existingUser || existingClient) {
            throw new Error(`Username "${updates.username}" is already taken.`);
        }
    }

    const finalUpdates = { ...updates };
    let notifyAdmin = false;

    if (!isAdmin && (updates.adharCardImage || updates.panCardImage || updates.contracts || updates.otherDocuments)) {
        if (updates.adharCardImage) {
            finalUpdates.pendingAdharCardImage = updates.adharCardImage;
            delete finalUpdates.adharCardImage;
        }
        if (updates.panCardImage) {
            finalUpdates.pendingPanCardImage = updates.panCardImage;
            delete finalUpdates.panCardImage;
        }
        if (updates.contracts) {
            finalUpdates.pendingContracts = updates.contracts;
            delete finalUpdates.contracts;
        }
        if (updates.otherDocuments) {
            finalUpdates.pendingOtherDocuments = updates.otherDocuments;
        }
        notifyAdmin = true;
    }

    const agencyFilter = requireAgencyFilter(agency);
    const userExists = await UserModel.exists({ id, ...agencyFilter });
    if (userExists) {
        await UserModel.updateOne({ id, ...agencyFilter }, { $set: finalUpdates });
    } else {
        const clientExists = await ClientModel.exists({ id, ...agencyFilter });
        if (!clientExists) {
            revalidatePath("/dashboard/settings");
            return;
        }
        await ClientModel.updateOne({ id, ...agencyFilter }, { $set: finalUpdates });
    }

    if (notifyAdmin && await isNotifEnabled("document")) {
        const admins = await UserModel.find({ ...agencyFilter, $or: [{ role: "admin" }, { role: "manager" }] }).select("-password").lean();
        const currentUserDoc = (
            await UserModel.findOne({ id, ...agencyFilter }).select("name").lean() as Pick<User, "name"> | null
        ) || (
            await ClientModel.findOne({ id, ...agencyFilter }).select("name").lean() as Pick<Client, "name"> | null
        );

        await NotificationModel.insertMany(admins.map((admin) => ({
            id: generateId(),
            agencyId: agency?.id,
            userId: admin.id,
            message: `${currentUserDoc?.name || "User"} has requested to update their identity documents.`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/team?edit=${id}`,
        })));
    }

    revalidatePath("/dashboard/team");
}

export async function approveDocumentUpdateImpl(
    userId: string,
    type: DocumentUpdateType,
    approve: boolean,
    agencyId?: string
) {
    await connectDB();
    const user = await UserModel.findOne({ id: userId, agencyId }).select("-password").lean() as User | null;
    if (!user) {
        revalidatePath("/dashboard/team");
        return;
    }

    const updates: {
        adharCardImage?: string | null;
        panCardImage?: string | null;
        contracts?: string[] | null;
        otherDocuments?: string[] | null;
        pendingAdharCardImage?: string | null;
        pendingPanCardImage?: string | null;
        pendingContracts?: string[] | null;
        pendingOtherDocuments?: string[] | null;
    } = {};

    if (approve) {
        if ((type === "adhar" || type === "both") && user.pendingAdharCardImage) {
            updates.adharCardImage = user.pendingAdharCardImage;
            updates.pendingAdharCardImage = null;
        }
        if ((type === "pan" || type === "both") && user.pendingPanCardImage) {
            updates.panCardImage = user.pendingPanCardImage;
            updates.pendingPanCardImage = null;
        }
        if (type === "contracts" && user.pendingContracts) {
            updates.contracts = user.pendingContracts;
            updates.pendingContracts = null;
        }
        if (type === "other" && user.pendingOtherDocuments) {
            updates.otherDocuments = user.pendingOtherDocuments;
            updates.pendingOtherDocuments = null;
        }
    } else {
        if (type === "adhar" || type === "both") updates.pendingAdharCardImage = null;
        if (type === "pan" || type === "both") updates.pendingPanCardImage = null;
        if (type === "contracts") updates.pendingContracts = null;
        if (type === "other") updates.pendingOtherDocuments = null;
    }

    await UserModel.updateOne({ id: userId, agencyId }, { $set: updates });

    const message = approve
        ? `Your document update request for ${type === "both" ? "documents" : type.toUpperCase()} has been APPROVED.`
        : `Your document update request for ${type === "both" ? "documents" : type.toUpperCase()} has been REJECTED.`;

    if (await isNotifEnabled("document")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId,
            message,
            read: false,
            timestamp: new Date().toISOString(),
        });
    }

    revalidatePath("/dashboard/team");
}

export async function adminResetPasswordImpl(
    id: string,
    newPassword: string,
    currentUser: UserMutationCaller,
    agencyId?: string
) {
    await validatePasswordWithPolicy(newPassword);
    await connectDB();

    const hashedPassword = await hashPassword(newPassword);
    await UserModel.updateOne({ id, agencyId }, { $set: { password: hashedPassword } });

    if (await isNotifEnabled("security")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId: id,
            message: `Your password was reset by ${currentUser.name}. If you did not request this, please contact your admin immediately.`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/settings",
        });
    }

    revalidatePath("/dashboard/team");
}
