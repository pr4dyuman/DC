import { EMAIL_TEMPLATES, sendEmail } from "./brevo-mail-core";

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
