/**
 * AI Blogger Notifications Service
 * Handles email alerts for schedule failures and other critical events
 */

import { sendEmail } from "./brevo-mail-core";
import { EMAIL_TEMPLATES } from "./email-constants";
import type { BlogStudioSchedule, BlogStudioNotificationSettings } from "./types-ai-blogger";

/**
 * Sends an email notification when a schedule fails
 * @param schedule The schedule that failed
 * @param error The error message that caused the failure
 * @param notificationSettings User's notification preferences
 * @param agencyName The name of the agency
 */
export async function notifyScheduleFailed(
    schedule: BlogStudioSchedule,
    error: string,
    notificationSettings: BlogStudioNotificationSettings | undefined,
    agencyName: string,
): Promise<boolean> {
    // Check if notification is enabled
    if (!notificationSettings?.scheduleFailureEmail) {
        return true; // Silently disabled
    }

    const recipients = notificationSettings.notificationEmails || [];
    if (recipients.length === 0) {
        return true; // No recipients configured, skip
    }

    try {
        const success = await sendEmail({
            to: recipients,
            templateId: EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_FAILED,
            params: {
                scheduleName: schedule.name,
                agencyName,
                errorMessage: error.slice(0, 200),
                failureCount: schedule.consecutiveFailures || 0,
                maxRetries: schedule.maxRetries || 3,
                failedAt: new Date().toISOString(),
            },
        });

        return success;
    } catch (notificationError) {
        console.error("[AIBloggerNotifications] Failed to send schedule failure notification:", notificationError);
        return false;
    }
}

/**
 * Sends an email notification when a schedule is auto-paused
 * @param schedule The schedule that was paused
 * @param consecutiveFailures The number of consecutive failures before auto-pause
 * @param notificationSettings User's notification preferences
 * @param agencyName The name of the agency
 */
export async function notifySchedulePaused(
    schedule: BlogStudioSchedule,
    consecutiveFailures: number,
    notificationSettings: BlogStudioNotificationSettings | undefined,
    agencyName: string,
): Promise<boolean> {
    // Check if notification is enabled
    if (!notificationSettings?.schedulePausedEmail) {
        return true; // Silently disabled
    }

    const recipients = notificationSettings.notificationEmails || [];
    if (recipients.length === 0) {
        return true; // No recipients configured, skip
    }

    try {
        const success = await sendEmail({
            to: recipients,
            templateId: EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_PAUSED,
            params: {
                scheduleName: schedule.name,
                agencyName,
                consecutiveFailures,
                maxRetries: schedule.maxRetries || 3,
                pausedAt: new Date().toISOString(),
                lastError: schedule.lastRunSummary ? schedule.lastRunSummary.slice(0, 200) : "Unknown error",
            },
        });

        return success;
    } catch (notificationError) {
        console.error("[AIBloggerNotifications] Failed to send schedule pause notification:", notificationError);
        return false;
    }
}

/**
 * Sends an email notification when webhook delivery fails
 * ENHANCEMENT: Added prominent webhook failure alert system
 */
export async function notifyWebhookDeliveryFailed(
    agencyName: string,
    postTitle: string,
    webhookUrl: string,
    failureCount: number,
    lastError: string,
    notificationSettings: BlogStudioNotificationSettings | undefined,
): Promise<boolean> {
    // Check if notifications are configured
    if (!notificationSettings?.notificationEmails || notificationSettings.notificationEmails.length === 0) {
        return true; // Silently skip if no recipients
    }

    const recipients = notificationSettings.notificationEmails;

    try {
        // Extract domain from webhook URL for privacy
        let webhookDomain = "unknown";
        try {
            webhookDomain = new URL(webhookUrl).hostname;
        } catch {
            webhookDomain = "configured webhook";
        }

        const success = await sendEmail({
            to: recipients,
            templateId: EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_FAILED,
            params: {
                agencyName,
                postTitle: postTitle.slice(0, 100),
                webhookUrl: webhookDomain,  // Masked for security
                failureCount,
                lastError: lastError.slice(0, 300),  // Truncate long errors
                failedAt: new Date().toISOString(),
                severity: "CRITICAL",  // Mark as critical alert
                action: "Check webhook configuration and re-send the blog post",
            },
        });

        // Log to console if email fails
        if (!success) {
            console.warn(
                `[AIBloggerNotifications] Failed to send webhook failure email to ${recipients.join(", ")}`
            );
        }

        return success;
    } catch (notificationError) {
        console.error(
            "[AIBloggerNotifications] Failed to send webhook failure notification:",
            notificationError instanceof Error ? notificationError.message : String(notificationError)
        );
        return false;
    }
}

/**
 * Sends an email notification when webhook delivery recovers after failures
 */
export async function notifyWebhookDeliveryRecovered(
    agencyName: string,
    postTitle: string,
    webhookUrl: string,
    notificationSettings: BlogStudioNotificationSettings | undefined,
): Promise<boolean> {
    if (!notificationSettings?.notificationEmails || notificationSettings.notificationEmails.length === 0) {
        return true;
    }

    const recipients = notificationSettings.notificationEmails;

    try {
        let webhookDomain = "unknown";
        try {
            webhookDomain = new URL(webhookUrl).hostname;
        } catch {
            webhookDomain = "configured webhook";
        }

        const success = await sendEmail({
            to: recipients,
            templateId: EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_FAILED,  // Fallback template
            params: {
                agencyName,
                postTitle: postTitle.slice(0, 100),
                webhookUrl: webhookDomain,
                message: `Webhook delivery has recovered successfully`,
                recoveredAt: new Date().toISOString(),
                severity: "INFO",
            },
        });

        return success;
    } catch (notificationError) {
        console.warn(
            "[AIBloggerNotifications] Failed to send webhook recovery notification:",
            notificationError instanceof Error ? notificationError.message : String(notificationError)
        );
        return false;
    }
}
