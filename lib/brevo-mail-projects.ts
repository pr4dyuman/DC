import { EMAIL_TEMPLATES, formatMoneyForEmail, sendEmail } from "./brevo-mail-core";

export async function sendProjectCreatedEmail(params: {
  clientEmail: string;
  clientName: string;
  projectName: string;
  budget: number;
  paymentPlan: string;
  invoiceCount: number;
  projectLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.PROJECT_CREATED,
    params: {
      CLIENT_NAME: params.clientName,
      PROJECT_NAME: params.projectName,
      BUDGET: await formatMoneyForEmail(params.budget),
      PAYMENT_PLAN: params.paymentPlan,
      INVOICE_COUNT: params.invoiceCount,
      PROJECT_LINK: params.projectLink,
    },
  });
}

export async function sendProjectStatusChangedEmail(params: {
  clientEmail: string;
  clientName: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  statusMessage: string;
  projectLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.PROJECT_STATUS_CHANGED,
    params: {
      CLIENT_NAME: params.clientName,
      PROJECT_NAME: params.projectName,
      OLD_STATUS: params.oldStatus,
      NEW_STATUS: params.newStatus,
      STATUS_MESSAGE: params.statusMessage,
      PROJECT_LINK: params.projectLink,
    },
  });
}

export async function sendProjectCompletedEmail(params: {
  clientEmail: string;
  adminEmails: string[];
  clientName: string;
  projectName: string;
  projectLink: string;
}) {
  await sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.PROJECT_COMPLETED,
    params: {
      RECIPIENT_NAME: params.clientName,
      PROJECT_NAME: params.projectName,
      PROJECT_LINK: params.projectLink,
      IS_CLIENT: true,
    },
  });

  if (params.adminEmails.length > 0) {
    await sendEmail({
      to: params.adminEmails,
      templateId: EMAIL_TEMPLATES.PROJECT_COMPLETED,
      params: {
        RECIPIENT_NAME: "Admin",
        PROJECT_NAME: params.projectName,
        CLIENT_NAME: params.clientName,
        PROJECT_LINK: params.projectLink,
        IS_CLIENT: false,
      },
    });
  }

  return true;
}
