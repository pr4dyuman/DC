/**
 * Brevo Email Service
 * Handles all email notifications for the agency-os application
 */

export { sendEmail } from "./brevo-mail-core";
export {
  sendProjectCreatedEmail,
  sendProjectStatusChangedEmail,
  sendProjectCompletedEmail,
} from "./brevo-mail-projects";
export {
  sendTaskAssignedEmail,
  sendTaskStatusChangedEmail,
  sendTaskCommentEmail,
} from "./brevo-mail-tasks";
export {
  sendInvoiceCreatedEmail,
  sendPaymentPendingApprovalEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendSalaryPaidEmail,
  sendRefundIssuedEmail,
} from "./brevo-mail-finance";
export {
  sendLeaveRequestedEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendLeaveCancelledEmail,
  sendDocumentUpdateRequestedEmail,
  sendDocumentUpdateResponseEmail,
} from "./brevo-mail-team";
export {
  sendClientAccountCreatedEmail,
  sendEmployeeAccountCreatedEmail,
} from "./brevo-mail-accounts";
