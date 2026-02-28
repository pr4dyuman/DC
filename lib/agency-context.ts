"use server";

import { cookies } from "next/headers";
import { AgencyModel, UserModel, ClientModel, SuperAdminModel } from "./mongodb";
import { Agency, User, Client, AGENCY_PLANS, SuperAdmin } from "./types";
import { getSessionUser } from "./auth";

/**
 * Get the current user's agency
 * For regular users: returns their agency
 * For super admins: returns selected agency from cookie
 */
export async function getCurrentAgency(): Promise<Agency | null> {
    try {
        // 1. Try JWT session first (primary auth)
        const session = await getSessionUser();
        const cookieStore = await cookies();

        let userId: string | undefined;
        let role: string | undefined;
        let agencyId: string | undefined;

        if (session) {
            userId = session.userId;
            role = session.role;
            agencyId = session.agencyId;
        } else {
            // Fallback to legacy cookie
            userId = cookieStore.get('userId')?.value;
        }

        if (!userId) {
            return null;
        }

        // If we already have agencyId from JWT, use it directly
        if (agencyId) {
            const agency = await AgencyModel.findOne({ id: agencyId }).lean();
            return agency as Agency | null;
        }

        // Super admin: use selected agency cookie
        if (role === 'superadmin') {
            const selectedAgencyId = cookieStore.get('selectedAgencyId')?.value;
            if (selectedAgencyId) {
                const agency = await AgencyModel.findOne({ id: selectedAgencyId }).lean();
                return agency as Agency | null;
            }
            return null; // Super admin must select an agency
        }

        // For legacy sessions without agencyId in JWT, look up from DB
        // 1. Check if user is a regular user
        const user = await UserModel.findOne({ id: userId }).lean();
        if (user) {
            const userAgencyId = user.agencyId || 'default-agency';
            const agency = await AgencyModel.findOne({ id: userAgencyId }).lean();
            return agency as Agency | null;
        }

        // 2. Check if user is a super admin (legacy path)
        const superAdmin = await SuperAdminModel.findOne({ id: userId }).lean();
        if (superAdmin) {
            const selectedAgencyId = cookieStore.get('selectedAgencyId')?.value;
            if (selectedAgencyId) {
                const agency = await AgencyModel.findOne({ id: selectedAgencyId }).lean();
                return agency as Agency | null;
            }
            return null;
        }

        // 3. Check if user is a client
        const client = await ClientModel.findOne({ id: userId }).lean();
        if (client) {
            const clientAgencyId = client.agencyId || 'default-agency';
            const agency = await AgencyModel.findOne({ id: clientAgencyId }).lean();
            return agency as Agency | null;
        }

        return null;

    } catch (error) {
        console.error('Error getting current agency:', error);
        return null;
    }
}

/**
 * Get agency by ID
 */
export async function getAgencyById(agencyId: string): Promise<Agency | null> {
    try {
        const agency = await AgencyModel.findOne({ id: agencyId }).lean();
        return agency as Agency | null;
    } catch (error) {
        console.error('Error getting agency by ID:', error);
        return null;
    }
}

/**
 * Get agency by slug
 */
export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
    try {
        const agency = await AgencyModel.findOne({ slug }).lean();
        return agency as Agency | null;
    } catch (error) {
        console.error('Error getting agency by slug:', error);
        return null;
    }
}

/**
 * Helper to add agencyId to new records
 * Usage: const project = await withAgencyId({ name: "New Project", ... });
 */
export async function withAgencyId<T extends object>(
    data: T
): Promise<T & { agencyId: string }> {
    const agency = await getCurrentAgency();
    if (!agency) {
        throw new Error('No agency context available. User must be logged in.');
    }

    return {
        ...data,
        agencyId: agency.id
    } as T & { agencyId: string };
}

/**
 * Check if agency has reached a specific limit
 */
export async function checkAgencyLimit(
    agencyId: string,
    limitType: 'users' | 'projects' | 'clients' | 'storage' | 'monthlyInvoices'
): Promise<{ allowed: boolean; current: number; limit: number }> {
    try {
        const agency = await AgencyModel.findOne({ id: agencyId }).lean();
        if (!agency) {
            throw new Error('Agency not found');
        }

        const current = agency.usage[limitType];
        const limit = agency.limits[limitType === 'monthlyInvoices' ? 'maxMonthlyInvoices' :
            limitType === 'users' ? 'maxUsers' :
                limitType === 'projects' ? 'maxProjects' :
                    limitType === 'clients' ? 'maxClients' : 'maxStorage'];

        // -1 means unlimited (enterprise plan)
        const allowed = limit === -1 || current < limit;

        return { allowed, current, limit };
    } catch (error) {
        console.error('Error checking agency limit:', error);
        return { allowed: false, current: 0, limit: 0 };
    }
}

/**
 * Update agency usage counters
 */
export async function updateAgencyUsage(
    agencyId: string,
    updates: Partial<{
        users: number;
        projects: number;
        clients: number;
        storage: number;
        monthlyInvoices: number;
    }>
): Promise<boolean> {
    try {
        const setUpdates: Record<string, number> = {};

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                setUpdates[`usage.${key}`] = value;
            }
        }

        await AgencyModel.updateOne(
            { id: agencyId },
            { $set: setUpdates }
        );

        return true;
    } catch (error) {
        console.error('Error updating agency usage:', error);
        return false;
    }
}

/**
 * Increment agency usage counter
 */
export async function incrementAgencyUsage(
    agencyId: string,
    field: 'users' | 'projects' | 'clients' | 'storage' | 'monthlyInvoices',
    amount: number = 1
): Promise<boolean> {
    try {
        await AgencyModel.updateOne(
            { id: agencyId },
            { $inc: { [`usage.${field}`]: amount } }
        );
        return true;
    } catch (error) {
        console.error('Error incrementing agency usage:', error);
        return false;
    }
}

/**
 * Decrement agency usage counter
 */
export async function decrementAgencyUsage(
    agencyId: string,
    field: 'users' | 'projects' | 'clients' | 'storage' | 'monthlyInvoices',
    amount: number = 1
): Promise<boolean> {
    try {
        await AgencyModel.updateOne(
            { id: agencyId },
            { $inc: { [`usage.${field}`]: -amount } }
        );
        return true;
    } catch (error) {
        console.error('Error decrementing agency usage:', error);
        return false;
    }
}

/**
 * Check if a feature is enabled for the agency
 */
export async function isFeatureEnabled(
    agencyId: string,
    feature: 'aiAssistant' | 'advancedReporting' | 'apiAccess' | 'whiteLabel' | 'customDomain' | 'ssoEnabled'
): Promise<boolean> {
    try {
        const agency = await AgencyModel.findOne({ id: agencyId }).lean();
        if (!agency) return false;

        return agency.features[feature] || false;
    } catch (error) {
        console.error('Error checking feature:', error);
        return false;
    }
}

/**
 * Get all agencies (super admin only)
 */
export async function getAllAgencies(): Promise<Agency[]> {
    try {
        const agencies = await AgencyModel.find({}).lean();
        return agencies as Agency[];
    } catch (error) {
        console.error('Error getting all agencies:', error);
        return [];
    }
}

/**
 * Switch agency context (super admin only)
 */
export async function switchAgency(agencyId: string): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) return false;

        // Verify user is super admin
        const superAdmin = await SuperAdminModel.findOne({ id: userId }).lean();
        if (!superAdmin) {
            throw new Error('Only super admins can switch agencies');
        }

        // Verify agency exists
        const agency = await AgencyModel.findOne({ id: agencyId }).lean();
        if (!agency) {
            throw new Error('Agency not found');
        }

        // Set selected agency cookie
        cookieStore.set('selectedAgencyId', agencyId);

        return true;
    } catch (error) {
        console.error('Error switching agency:', error);
        return false;
    }
}

/**
 * Clear agency selection (super admin only)
 */
export async function clearAgencySelection(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('selectedAgencyId');
        return true;
    } catch (error) {
        console.error('Error clearing agency selection:', error);
        return false;
    }
}
