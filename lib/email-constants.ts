/**
 * Email Template IDs (to be created in Brevo dashboard)
 */
export const EMAIL_TEMPLATES = {
  // Project Management
  PROJECT_CREATED: 2,
  PROJECT_STATUS_CHANGED: 3,
  PROJECT_COMPLETED: 4,

  // Task Management
  TASK_ASSIGNED: 5,
  TASK_STATUS_CHANGED: 6,
  TASK_COMMENT_ADDED: 7,

  // Invoice & Payment
  INVOICE_CREATED: 8,
  PAYMENT_PENDING_APPROVAL: 9,
  PAYMENT_APPROVED: 10,
  PAYMENT_REJECTED: 11,

  // Leave Management
  LEAVE_REQUESTED: 12,
  LEAVE_APPROVED: 13,
  LEAVE_REJECTED: 14,
  LEAVE_CANCELLED: 15,

  // Salary & Payroll
  SALARY_PAID: 16,

  // Refund Management
  REFUND_ISSUED: 17,

  // Document Approval
  DOCUMENT_UPDATE_REQUESTED: 18,
  DOCUMENT_UPDATE_RESPONSE: 19,

  // Account Creation
  CLIENT_ACCOUNT_CREATED: 20,
  EMPLOYEE_ACCOUNT_CREATED: 21,
} as const;
