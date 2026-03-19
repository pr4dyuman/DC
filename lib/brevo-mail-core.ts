import { EMAIL_TEMPLATES, TEMPLATE_TO_CATEGORY, DEFAULT_EMAIL_CATEGORIES } from "./email-constants";
import { getCurrentAgency } from "./agency-context";
import { formatCurrency } from "./currency";
import { getDefaultCurrency } from "./actions/super-admin";

export type TemplateParams = Record<string, string | number | boolean | null | undefined>;
type EmailCategoryKey = keyof typeof DEFAULT_EMAIL_CATEGORIES;

interface EmailParams {
  to: string | string[];
  templateId: number;
  params: TemplateParams;
  subject?: string;
}

export async function sendEmail({ to, templateId, params, subject }: EmailParams): Promise<boolean> {
  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
    const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;

    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !BREVO_SENDER_NAME) {
      console.warn("[Brevo] Email service not configured. Skipping email send.");
      return false;
    }

    const agency = await getCurrentAgency();
    if (agency?.settings?.emailNotificationsEnabled === false) {
      console.warn("[Brevo] Email sending is globally disabled via settings.");
      return true;
    }

    const category = TEMPLATE_TO_CATEGORY[templateId];
    if (category) {
      const categories = (agency?.settings?.emailCategories || {}) as Partial<Record<EmailCategoryKey, boolean>>;
      const isEnabled = categories[category as EmailCategoryKey] ?? DEFAULT_EMAIL_CATEGORIES[category as EmailCategoryKey];
      if (!isEnabled) {
        console.log(`[Brevo] Email category "${category}" is disabled. Skipping template ${templateId}.`);
        return true;
      }
    }

    const recipients = Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }];

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
