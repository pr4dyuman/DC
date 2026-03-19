import { EMAIL_TEMPLATES, sendEmail } from "./brevo-mail-core";

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
      REJECTION_REASON: params.rejectionReason || "No reason provided",
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
      STATUS: params.approved ? "APPROVED" : "REJECTED",
      PROFILE_LINK: params.profileLink,
    },
  });
}
