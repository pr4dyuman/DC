import { EMAIL_TEMPLATES, sendEmail } from "./brevo-mail-core";

export async function sendClientAccountCreatedEmail(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  username: string;
  dashboardLink: string;
  agencyName: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    templateId: EMAIL_TEMPLATES.CLIENT_ACCOUNT_CREATED,
    params: {
      CLIENT_NAME: params.clientName || "Valued Client",
      COMPANY_NAME: params.companyName || "",
      USERNAME: params.username || "",
      DASHBOARD_LINK: params.dashboardLink || "",
      AGENCY_NAME: params.agencyName || "Agency",
    },
  });
}

export async function sendEmployeeAccountCreatedEmail(params: {
  employeeEmail: string;
  employeeName: string;
  username: string;
  role: string;
  dashboardLink: string;
  agencyName: string;
}) {
  return sendEmail({
    to: params.employeeEmail,
    templateId: EMAIL_TEMPLATES.EMPLOYEE_ACCOUNT_CREATED,
    params: {
      EMPLOYEE_NAME: params.employeeName || "Team Member",
      USERNAME: params.username || "",
      ROLE: params.role || "",
      DASHBOARD_LINK: params.dashboardLink || "",
      AGENCY_NAME: params.agencyName || "Agency",
    },
  });
}
