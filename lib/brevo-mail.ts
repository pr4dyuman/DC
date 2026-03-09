/**
 * Brevo Email Service
 * Handles all email notifications for the agency-os application
 */

import { EMAIL_TEMPLATES, TEMPLATE_TO_CATEGORY, DEFAULT_EMAIL_CATEGORIES } from "./email-constants";
import type { EmailCategory } from "./email-constants";
import { getCurrentAgency } from "./agency-context";

interface EmailParams {
  to: string | string[];
  templateId: number;
  params: Record<string, any>;
  subject?: string;
}

/**
 * Send email using Brevo API
 */
export async function sendEmail({ to, templateId, params, subject }: EmailParams): Promise<boolean> {
  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
    const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;

    // Skip if Brevo is not configured
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !BREVO_SENDER_NAME) {
      console.warn('[Brevo] Email service not configured. Skipping email send.');
      return false;
    }

    // CHECK: Global Kill Switch
    const agency = await getCurrentAgency();
    if (agency?.settings?.emailNotificationsEnabled === false) {
      console.warn('[Brevo] Email sending is globally disabled via settings.');
      return true;
    }

    // CHECK: Per-category toggle
    const category = TEMPLATE_TO_CATEGORY[templateId];
    if (category) {
      const categories = agency?.settings?.emailCategories || {};
      const isEnabled = (categories as any)[category] ?? DEFAULT_EMAIL_CATEGORIES[category];
      if (!isEnabled) {
        console.log(`[Brevo] Email category "${category}" is disabled. Skipping template ${templateId}.`);
        return true;
      }
    }

    const recipients = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
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
      console.error('[Brevo] Email send failed:', error);
      return false;
    }

    const result = await response.json();
    console.log('[Brevo] Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('[Brevo] Email send error:', error);
    return false;
  }
}

// ============================================================================
// PROJECT MANAGEMENT EMAILS
// ============================================================================

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
      BUDGET: params.budget.toLocaleString('en-IN'),
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
  // Send to client
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

  // Send to admins
  if (params.adminEmails.length > 0) {
    await sendEmail({
      to: params.adminEmails,
      templateId: EMAIL_TEMPLATES.PROJECT_COMPLETED,
      params: {
        RECIPIENT_NAME: 'Admin',
        PROJECT_NAME: params.projectName,
        CLIENT_NAME: params.clientName,
        PROJECT_LINK: params.projectLink,
        IS_CLIENT: false,
      },
    });
  }

  return true;
}

// ============================================================================
// TASK MANAGEMENT EMAILS
// ============================================================================

export async function sendTaskAssignedEmail(params: {
  assigneeEmail: string;
  assigneeName: string;
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  dueDate: string;
  priority: string;
  taskLink: string;
}) {
  return sendEmail({
    to: params.assigneeEmail,
    templateId: EMAIL_TEMPLATES.TASK_ASSIGNED,
    params: {
      ASSIGNEE_NAME: params.assigneeName,
      TASK_TITLE: params.taskTitle,
      TASK_DESCRIPTION: params.taskDescription,
      PROJECT_NAME: params.projectName,
      DUE_DATE: params.dueDate,
      PRIORITY: params.priority,
      TASK_LINK: params.taskLink,
    },
  });
}

export async function sendTaskStatusChangedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  taskLink: string;
}) {
  return sendEmail({
    to: params.recipientEmail,
    templateId: EMAIL_TEMPLATES.TASK_STATUS_CHANGED,
    params: {
      RECIPIENT_NAME: params.recipientName,
      TASK_TITLE: params.taskTitle,
      OLD_STATUS: params.oldStatus,
      NEW_STATUS: params.newStatus,
      UPDATED_BY: params.updatedBy,
      TASK_LINK: params.taskLink,
    },
  });
}

export async function sendTaskCommentEmail(params: {
  recipientEmails: string[];
  taskTitle: string;
  commenterName: string;
  commentText: string;
  taskLink: string;
}) {
  return sendEmail({
    to: params.recipientEmails,
    templateId: EMAIL_TEMPLATES.TASK_COMMENT_ADDED,
    params: {
      TASK_TITLE: params.taskTitle,
      COMMENTER_NAME: params.commenterName,
      COMMENT_TEXT: params.commentText,
      TASK_LINK: params.taskLink,
    },
  });
}

// ============================================================================
// INVOICE & PAYMENT EMAILS
// ============================================================================

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
      AMOUNT: params.amount.toLocaleString('en-IN'),
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
      AMOUNT: params.amount.toLocaleString('en-IN'),
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
      AMOUNT: params.amount.toLocaleString('en-IN'),
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
      AMOUNT: params.amount.toLocaleString('en-IN'),
      PROJECT_NAME: params.projectName,
      REJECTION_REASON: params.rejectionReason || 'No reason provided',
      FINANCE_LINK: params.financeLink,
    },
  });
}

// ============================================================================
// LEAVE MANAGEMENT EMAILS
// ============================================================================

export async function sendLeaveRequestedEmail(params: {
  adminEmails: string[];
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  teamLink: string;
}) {
  return sendEmail({
    to: params.adminEmails,
    templateId: EMAIL_TEMPLATES.LEAVE_REQUESTED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      LEAVE_TYPE: params.leaveType,
      START_DATE: params.startDate,
      END_DATE: params.endDate,
      DAYS: params.days,
      REASON: params.reason,
      TEAM_LINK: params.teamLink,
    },
  });
}

export async function sendLeaveApprovedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approvedBy: string;
  teamLink: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.LEAVE_APPROVED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      LEAVE_TYPE: params.leaveType,
      START_DATE: params.startDate,
      END_DATE: params.endDate,
      DAYS: params.days,
      APPROVED_BY: params.approvedBy,
      TEAM_LINK: params.teamLink,
    },
  });
}

export async function sendLeaveRejectedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  rejectedBy: string;
  rejectionReason?: string;
  teamLink: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.LEAVE_REJECTED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      LEAVE_TYPE: params.leaveType,
      START_DATE: params.startDate,
      END_DATE: params.endDate,
      DAYS: params.days,
      REJECTED_BY: params.rejectedBy,
      REJECTION_REASON: params.rejectionReason || 'No reason provided',
      TEAM_LINK: params.teamLink,
    },
  });
}

export async function sendLeaveCancelledEmail(params: {
  adminEmails: string[];
  employeeName: string;
  leaveType: string;
  teamLink: string;
}) {
  return sendEmail({
    to: params.adminEmails,
    templateId: EMAIL_TEMPLATES.LEAVE_CANCELLED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      LEAVE_TYPE: params.leaveType,
      TEAM_LINK: params.teamLink,
    },
  });
}

// ============================================================================
// SALARY & PAYROLL EMAILS
// ============================================================================

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
      AMOUNT: params.amount.toLocaleString('en-IN'),
      MONTH: params.month,
      PAYMENT_DATE: params.paymentDate,
      FINANCE_LINK: params.financeLink,
    },
  });
}

// ============================================================================
// REFUND MANAGEMENT EMAILS
// ============================================================================

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
      AMOUNT: params.amount.toLocaleString('en-IN'),
      PROJECT_NAME: params.projectName,
      REFUND_REASON: params.refundReason,
      PROJECT_LINK: params.projectLink,
    },
  });
}

// ============================================================================
// DOCUMENT APPROVAL EMAILS
// ============================================================================

export async function sendDocumentUpdateRequestedEmail(params: {
  adminEmails: string[];
  employeeName: string;
  documentType: string;
  teamLink: string;
}) {
  return sendEmail({
    to: params.adminEmails,
    templateId: EMAIL_TEMPLATES.DOCUMENT_UPDATE_REQUESTED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      DOCUMENT_TYPE: params.documentType,
      TEAM_LINK: params.teamLink,
    },
  });
}

export async function sendDocumentUpdateResponseEmail(params: {
  employeeEmail: string;
  employeeName: string;
  documentType: string;
  approved: boolean;
  profileLink: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.DOCUMENT_UPDATE_RESPONSE,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      DOCUMENT_TYPE: params.documentType,
      STATUS: params.approved ? 'APPROVED' : 'REJECTED',
      PROFILE_LINK: params.profileLink,
    },
  });
}

// ============================================================================
// ACCOUNT CREATION EMAILS
// ============================================================================

export async function sendClientAccountCreatedEmail(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  username: string;
  password: string;
  dashboardLink: string;
  agencyName: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.CLIENT_ACCOUNT_CREATED,
    params: {
      CLIENT_NAME: params.clientName,
      COMPANY_NAME: params.companyName,
      USERNAME: params.username,
      PASSWORD: params.password,
      DASHBOARD_LINK: params.dashboardLink,
      AGENCY_NAME: params.agencyName,
    },
  });
}

export async function sendEmployeeAccountCreatedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  username: string;
  password: string;
  role: string;
  dashboardLink: string;
  agencyName: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.EMPLOYEE_ACCOUNT_CREATED,
    params: {
      EMPLOYEE_NAME: params.employeeName,
      USERNAME: params.username,
      PASSWORD: params.password,
      ROLE: params.role,
      DASHBOARD_LINK: params.dashboardLink,
      AGENCY_NAME: params.agencyName,
    },
  });
}
