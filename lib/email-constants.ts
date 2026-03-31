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

  // AI Blogger
  AI_BLOGGER_SCHEDULE_FAILED: 22,
  AI_BLOGGER_SCHEDULE_PAUSED: 23,
} as const;

/**
 * Email categories — each can be toggled on/off in agency settings.
 * 'critical' = recommended always-on (credentials, money)
 * 'optional' = can be turned off to reduce volume
 */
export type EmailCategory =
  | 'accountCreation'
  | 'invoicePayment'
  | 'salaryPayroll'
  | 'refund'
  | 'projectUpdates'
  | 'taskUpdates'
  | 'leaveManagement'
  | 'documentApproval'
  | 'aiBloggerAlerts';

export const EMAIL_CATEGORY_INFO: Record<EmailCategory, { label: string; description: string; priority: 'critical' | 'optional' }> = {
  accountCreation: { label: 'Account Creation', description: 'Login credentials for new employees & clients', priority: 'critical' },
  invoicePayment: { label: 'Invoice & Payment', description: 'Invoice created, payment approved/rejected', priority: 'critical' },
  salaryPayroll: { label: 'Salary & Payroll', description: 'Salary payment confirmations to employees', priority: 'critical' },
  refund: { label: 'Refund', description: 'Refund issued notifications to clients', priority: 'critical' },
  projectUpdates: { label: 'Project Updates', description: 'Project created, status changed, completed', priority: 'optional' },
  taskUpdates: { label: 'Task Updates', description: 'Task assigned, status changed, comments', priority: 'optional' },
  leaveManagement: { label: 'Leave Management', description: 'Leave requested, approved, rejected, cancelled', priority: 'optional' },
  documentApproval: { label: 'Document Approval', description: 'Document update requests and responses', priority: 'optional' },
  aiBloggerAlerts: { label: 'AI Blogger Alerts', description: 'Schedule failures and pauses', priority: 'optional' },
};

/** Map each template ID to its category */
export const TEMPLATE_TO_CATEGORY: Record<number, EmailCategory> = {
  [EMAIL_TEMPLATES.CLIENT_ACCOUNT_CREATED]: 'accountCreation',
  [EMAIL_TEMPLATES.EMPLOYEE_ACCOUNT_CREATED]: 'accountCreation',
  [EMAIL_TEMPLATES.INVOICE_CREATED]: 'invoicePayment',
  [EMAIL_TEMPLATES.PAYMENT_PENDING_APPROVAL]: 'invoicePayment',
  [EMAIL_TEMPLATES.PAYMENT_APPROVED]: 'invoicePayment',
  [EMAIL_TEMPLATES.PAYMENT_REJECTED]: 'invoicePayment',
  [EMAIL_TEMPLATES.SALARY_PAID]: 'salaryPayroll',
  [EMAIL_TEMPLATES.REFUND_ISSUED]: 'refund',
  [EMAIL_TEMPLATES.PROJECT_CREATED]: 'projectUpdates',
  [EMAIL_TEMPLATES.PROJECT_STATUS_CHANGED]: 'projectUpdates',
  [EMAIL_TEMPLATES.PROJECT_COMPLETED]: 'projectUpdates',
  [EMAIL_TEMPLATES.TASK_ASSIGNED]: 'taskUpdates',
  [EMAIL_TEMPLATES.TASK_STATUS_CHANGED]: 'taskUpdates',
  [EMAIL_TEMPLATES.TASK_COMMENT_ADDED]: 'taskUpdates',
  [EMAIL_TEMPLATES.LEAVE_REQUESTED]: 'leaveManagement',
  [EMAIL_TEMPLATES.LEAVE_APPROVED]: 'leaveManagement',
  [EMAIL_TEMPLATES.LEAVE_REJECTED]: 'leaveManagement',
  [EMAIL_TEMPLATES.LEAVE_CANCELLED]: 'leaveManagement',
  [EMAIL_TEMPLATES.DOCUMENT_UPDATE_REQUESTED]: 'documentApproval',
  [EMAIL_TEMPLATES.DOCUMENT_UPDATE_RESPONSE]: 'documentApproval',
  [EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_FAILED]: 'aiBloggerAlerts',
  [EMAIL_TEMPLATES.AI_BLOGGER_SCHEDULE_PAUSED]: 'aiBloggerAlerts',
};

/** Default category states — critical ON, optional OFF */
export const DEFAULT_EMAIL_CATEGORIES: Record<EmailCategory, boolean> = {
  accountCreation: true,
  invoicePayment: true,
  salaryPayroll: true,
  refund: true,
  projectUpdates: false,
  taskUpdates: false,
  leaveManagement: false,
  documentApproval: false,
  aiBloggerAlerts: true,
};

/** Task email event types with per-recipient toggles */
export type TaskEmailEventKey = 'taskCreated' | 'taskInProgress' | 'taskDone';

export interface TaskEmailEventConfig {
  enabled: boolean;
  notifyAssignee: boolean;
  notifyClient: boolean;
}

export const TASK_EMAIL_EVENTS: Record<TaskEmailEventKey, { label: string; description: string }> = {
  taskCreated: { label: 'Task Created', description: 'When a new task is created and assigned' },
  taskInProgress: { label: 'Task In Progress', description: 'When a task is moved to in-progress' },
  taskDone: { label: 'Task Completed', description: 'When a task is marked as done' },
};

export const DEFAULT_TASK_EMAIL_EVENTS: Record<TaskEmailEventKey, TaskEmailEventConfig> = {
  taskCreated: { enabled: true, notifyAssignee: true, notifyClient: false },
  taskInProgress: { enabled: false, notifyAssignee: true, notifyClient: false },
  taskDone: { enabled: false, notifyAssignee: true, notifyClient: true },
};
