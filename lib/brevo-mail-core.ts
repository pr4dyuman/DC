import { EMAIL_TEMPLATES, TEMPLATE_TO_CATEGORY, DEFAULT_EMAIL_CATEGORIES } from "./email-constants";
import { getCurrentAgency } from "./agency-context";
import { formatCurrency } from "./currency";
import { getDefaultCurrency } from "./actions/super-admin";
import { getEffectiveEmailSettings } from "./email-policy";

export type TemplateParams = Record<string, string | number | boolean | null | undefined>;
type EmailCategoryKey = keyof typeof DEFAULT_EMAIL_CATEGORIES;

interface EmailParams {
  to: string | string[];
  templateId: number;
  params: TemplateParams;
  subject?: string;
  agencyId?: string;
}

export async function sendEmail({ to, templateId, params, subject, agencyId }: EmailParams): Promise<boolean> {
  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
    const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;
    const BREVO_REPLY_TO_EMAIL = process.env.BREVO_REPLY_TO_EMAIL;
    const BREVO_REPLY_TO_NAME = process.env.BREVO_REPLY_TO_NAME;

    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !BREVO_SENDER_NAME) {
      console.warn("[Brevo] Email service not configured. Skipping email send.");
      return false;
    }

    const agency = agencyId ? null : await getCurrentAgency();
    const emailSettings = await getEffectiveEmailSettings({ agency, agencyId });
    const category = TEMPLATE_TO_CATEGORY[templateId];
    const isAccountAuthTemplate = category === "accountCreation";

    if (isAccountAuthTemplate && !emailSettings.accountAuthEnabled) {
      console.warn("[Brevo] Account creation and password reset emails are disabled by platform settings.");
      return true;
    }

    if (!isAccountAuthTemplate && !emailSettings.platformEnabled) {
      console.warn("[Brevo] Email sending is disabled by platform email settings.");
      return true;
    }

    if (!isAccountAuthTemplate && !emailSettings.agencyEnabled) {
      console.warn("[Brevo] Email sending is disabled for this agency.");
      return true;
    }

    if (category && !isAccountAuthTemplate) {
      const isEnabled = emailSettings.categories[category as EmailCategoryKey] ?? DEFAULT_EMAIL_CATEGORIES[category as EmailCategoryKey];
      if (!isEnabled) {
        console.log(`[Brevo] Email category "${category}" is disabled. Skipping template ${templateId}.`);
        return true;
      }
    }

    const recipients = (Array.isArray(to) ? to : [to])
      .map((email) => String(email || "").trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    if (recipients.length === 0) {
      console.warn(`[Brevo] No recipients provided. Skipping template ${templateId}.`);
      return true;
    }

    const replyTo = BREVO_REPLY_TO_EMAIL
      ? { email: BREVO_REPLY_TO_EMAIL, ...(BREVO_REPLY_TO_NAME && { name: BREVO_REPLY_TO_NAME }) }
      : undefined;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        ...(replyTo && { replyTo }),
        to: recipients,
        templateId,
        params,
        ...(subject && { subject }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Brevo] Email send failed:", error);
      return false;
    }

    const result = await response.json();
    console.log("[Brevo] Email sent successfully:", result.messageId);
    return true;
  } catch (error) {
    console.error("[Brevo] Email send error:", error);
    return false;
  }
}

export async function formatMoneyForEmail(amount: number) {
  return formatCurrency(amount, await getDefaultCurrency());
}

export { EMAIL_TEMPLATES };
