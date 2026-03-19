import "server-only";

import type { Agency } from "../db";
import { SystemSettingsModel } from "../mongodb";
import { validatePassword, validateStrongPassword } from "../validation";
import { getNotificationDefaults } from "./super-admin";

type SystemSecuritySettings = {
    security?: {
        enforceStrongPasswords?: boolean;
    };
};

export type NotifType = 'welcome' | 'project' | 'task' | 'invoice' | 'salary' | 'leave' | 'refund' | 'document' | 'security';
export type AgencyScopedRecord = { agencyId?: string };

export async function validatePasswordWithPolicy(password: string) {
    const sys = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'security.enforceStrongPasswords': 1 }
    ).lean() as SystemSecuritySettings | null;
    const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
    if (enforceStrong) {
        validateStrongPassword(password);
    } else {
        validatePassword(password);
    }
}

export async function isNotifEnabled(type: NotifType): Promise<boolean> {
    try {
        const defaults = await getNotificationDefaults();
        return defaults[type] ?? true;
    } catch {
        return true;
    }
}

export function requireAgencyFilter(agency: Agency | null): { agencyId: string } {
    if (!agency?.id) throw new Error('Agency context required');
    return { agencyId: agency.id };
}

export function withAgencyIdFallback<T extends AgencyScopedRecord>(value: T, fallbackAgencyId: string): T & { agencyId: string } {
    return { ...value, agencyId: value.agencyId || fallbackAgencyId };
}

export function sortByDateDesc<T extends { date?: string | null }>(a: T, b: T) {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
}

export function sortByUploadedAtDesc<T extends { uploadedAt?: string | null }>(a: T, b: T) {
    return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
}

export function sanitizeDoc(doc: unknown) {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}
