import "server-only";

import { revalidatePath } from "next/cache";
import type { Agency, Client } from "../db";
import { checkAgencyLimit, decrementAgencyUsage, incrementAgencyUsage, withAgencyId } from "../agency-context";
import { sendClientAccountCreatedEmail } from "../brevo-mail";
import { hashPassword } from "../auth";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeName, sanitizePhone, sanitizeUpdates, sanitizeUsername, validateEmail } from "../validation";
import { isNotifEnabled, sanitizeDoc, validatePasswordWithPolicy } from "./shared";
import { ClientModel, NotificationModel, ProjectModel, UserModel, connectDB } from "../mongodb";

type AgencyContext = Pick<Agency, "id" | "name"> | null;

export async function createClientImpl(client: Omit<Client, "id" | "agencyId">, agency: AgencyContext) {
    client = sanitizeMongoInput(client);
    client.name = sanitizeName(client.name);
    if (!client.name) throw new Error("Client name is required");
    client.companyName = sanitizeName(client.companyName);
    if (!client.companyName) throw new Error("Company name is required");
    if (client.email) client.email = validateEmail(client.email);
    if (client.phone) client.phone = sanitizePhone(client.phone);
    if (client.password) await validatePasswordWithPolicy(client.password);

    let username = client.username ? sanitizeUsername(client.username) : "";
    if (!username) {
        username = client.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    }

    await connectDB();

    if (agency) {
        const clientLimit = await checkAgencyLimit(agency.id, "clients");
        if (!clientLimit.allowed) {
            throw new Error(`Plan limit reached: your plan allows ${clientLimit.limit} clients (currently ${clientLimit.current}).`);
        }
    }

    const agencyFilter = agency ? { agencyId: agency.id } : {};
    let uniqueUsername = username;
    let counter = 1;
    while (
        await UserModel.exists({ username: uniqueUsername, ...agencyFilter }) ||
        await ClientModel.exists({ username: uniqueUsername, ...agencyFilter })
    ) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    const newClient: Client = await withAgencyId({
        ...client,
        id: generateId(),
        username: uniqueUsername,
        lastActiveAt: new Date().toISOString(),
    });

    if (!newClient.logo) {
        newClient.logo = `https://api.dicebear.com/7.x/initials/svg?seed=${newClient.companyName}`;
    }
    if (newClient.password) {
        newClient.password = await hashPassword(newClient.password);
    }

    try {
        await ClientModel.create(newClient);
    } catch (err: unknown) {
        const writeError = err as { code?: number; keyPattern?: { username?: number } };
        if (writeError?.code === 11000 && writeError?.keyPattern?.username) {
            let retryUsername = uniqueUsername;
            let retryCounter = counter;
            for (let i = 0; i < 5; i++) {
                retryUsername = `${username}${retryCounter}`;
                retryCounter++;
                newClient.username = retryUsername;
                try {
                    await ClientModel.create(newClient);
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

    if (agency) await incrementAgencyUsage(agency.id, "clients");

    try {
        if (newClient.email) {
            await sendClientAccountCreatedEmail({
                clientEmail: newClient.email,
                clientName: newClient.name,
                companyName: newClient.companyName,
                username: newClient.username || "",
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
                agencyName: agency?.name || "Agency",
            });
        }
    } catch (emailError) {
        console.error("[Email] Failed to send client account creation email:", emailError);
    }

    try {
        if (await isNotifEnabled("welcome")) {
            await NotificationModel.create({
                id: generateId(),
                agencyId: agency?.id,
                userId: newClient.id,
                message: `Welcome, ${newClient.name}! Your client portal is ready. Check your projects and invoices here.`,
                read: false,
                timestamp: new Date().toISOString(),
                link: "/dashboard",
            });
        }
    } catch (notifError) {
        console.error("[Notification] Failed to create client welcome notification:", notifError);
    }

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/team");
    return newClient;
}

export async function updateClientImpl(id: string, updates: Partial<Client>, agencyId?: string) {
    await connectDB();

    updates = sanitizeUpdates(updates) as Partial<Client>;
    if (updates.name) updates.name = sanitizeName(updates.name);
    if (updates.companyName) updates.companyName = sanitizeName(updates.companyName);
    if (updates.email) updates.email = validateEmail(updates.email);
    if (updates.phone) updates.phone = sanitizePhone(updates.phone);
    if (updates.username) updates.username = sanitizeUsername(updates.username);

    if (updates.name) {
        const oldClient = await ClientModel.findOne({ id, agencyId }).select("name").lean() as Pick<Client, "name"> | null;
        const oldName = oldClient?.name;
        if (oldName && oldName !== updates.name) {
            await ProjectModel.updateMany(
                { clientId: id, agencyId },
                { $set: { client: updates.name } }
            );
        }
    }

    await ClientModel.updateOne(
        { id, agencyId },
        { $set: { ...updates, updatedAt: new Date().toISOString() } }
    );

    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${id}`);
    revalidatePath("/dashboard/projects");
}

export async function deleteClientImpl(id: string, agencyId?: string) {
    await connectDB();

    const client = await ClientModel.findOne({ id, agencyId }).select("-password").lean();
    if (!client) throw new Error("Client not found");

    await ClientModel.updateOne(
        { id, agencyId },
        { $set: { archived: true, archivedAt: new Date().toISOString() } }
    );
    await ProjectModel.updateMany(
        { clientId: id, agencyId, status: "Active" },
        { $set: { status: "On Hold" } }
    );
    await NotificationModel.deleteMany({ userId: id, agencyId });
    if (agencyId) await decrementAgencyUsage(agencyId, "clients");

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
}

export async function getArchivedClientsImpl(agencyId?: string) {
    await connectDB();
    const clients = await ClientModel.find({ agencyId, archived: true }).select("-password").lean();
    return clients.map((client) => sanitizeDoc(client) as Client);
}

export async function unarchiveClientImpl(id: string, agencyId?: string) {
    await connectDB();

    const client = await ClientModel.findOne({ id, agencyId }).select("-password").lean() as Client | null;
    if (!client) throw new Error("Client not found");
    if (!client.archived) throw new Error("Client is not archived");

    await ClientModel.updateOne(
        { id, agencyId },
        { $set: { archived: false }, $unset: { archivedAt: "" } }
    );
    if (agencyId) await incrementAgencyUsage(agencyId, "clients");

    revalidatePath("/dashboard/clients");
}
