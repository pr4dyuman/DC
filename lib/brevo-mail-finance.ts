import { EMAIL_TEMPLATES, formatMoneyForEmail, sendEmail } from "./brevo-mail-core";

export async function sendInvoiceCreatedEmail(params: {
  clientEmail: string;
  clientName: string;
  amount: number;
  projectName: string;
  dueDate: string;
  financeLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.INVOICE_CREATED,
    params: {
      CLIENT_NAME: params.clientName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      PROJECT_NAME: params.projectName,
      DUE_DATE: params.dueDate,
      FINANCE_LINK: params.financeLink,
    },
  });
}

export async function sendPaymentPendingApprovalEmail(params: {
  adminEmails: string[];
  clientName: string;
  amount: number;
  projectName: string;
  financeLink: string;
}) {
  return sendEmail({
    to: params.adminEmails,
    templateId: EMAIL_TEMPLATES.PAYMENT_PENDING_APPROVAL,
    params: {
      CLIENT_NAME: params.clientName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      PROJECT_NAME: params.projectName,
      FINANCE_LINK: params.financeLink,
    },
  });
}

export async function sendPaymentApprovedEmail(params: {
  clientEmail: string;
  clientName: string;
  amount: number;
  projectName: string;
  financeLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.PAYMENT_APPROVED,
    params: {
      CLIENT_NAME: params.clientName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      PROJECT_NAME: params.projectName,
      FINANCE_LINK: params.financeLink,
    },
  });
}

export async function sendPaymentRejectedEmail(params: {
  clientEmail: string;
  clientName: string;
  amount: number;
  projectName: string;
  rejectionReason?: string;
  financeLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.PAYMENT_REJECTED,
    params: {
      CLIENT_NAME: params.clientName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      PROJECT_NAME: params.projectName,
      REJECTION_REASON: params.rejectionReason || "No reason provided",
      FINANCE_LINK: params.financeLink,
    },
  });
}

export async function sendSalaryPaidEmail(params: {
  employeeEmail: string;
  employeeName: string;
  amount: number;
  month: string;
  paymentDate: string;
  financeLink: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.SALARY_PAID,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      MONTH: params.month,
      PAYMENT_DATE: params.paymentDate,
      FINANCE_LINK: params.financeLink,
    },
  });
}

export async function sendRefundIssuedEmail(params: {
  clientEmail: string;
  clientName: string;
  amount: number;
  projectName: string;
  refundReason: string;
  projectLink: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.REFUND_ISSUED,
    params: {
      CLIENT_NAME: params.clientName,
      AMOUNT: await formatMoneyForEmail(params.amount),
      PROJECT_NAME: params.projectName,
      REFUND_REASON: params.refundReason,
      PROJECT_LINK: params.projectLink,
    },
  });
}
