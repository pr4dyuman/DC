/* eslint-disable @typescript-eslint/no-require-imports */

require('dotenv').config();

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@agency.com';
const senderName = process.env.BREVO_SENDER_NAME || 'Digital corvids';

if (!apiKey) {
  console.error('❌ BREVO_API_KEY not found in .env');
  process.exit(1);
}

const sender = { name: senderName, email: senderEmail };

const templates = [
  {
    name: 'Project Created',
    subject: 'New Project Created: {{params.PROJECT_NAME}}',
    key: 'PROJECT_CREATED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .highlight { color: #F59E0B; font-weight: 600; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Project Created</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>We are excited to start working on your new project, <span class="highlight">{{params.PROJECT_NAME}}</span>!</p>
      <p><strong>Project Details:</strong></p>
      <ul>
        <li>Budget: ₹{{params.BUDGET}}</li>
        <li>Payment Plan: {{params.PAYMENT_PLAN}}</li>
        <li>Invoices: {{params.INVOICE_COUNT}}</li>
      </ul>
      <p>You can track the progress and view details in your dashboard.</p>
      <center><a href="{{params.PROJECT_LINK}}" class="button">View Project</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{params.AGENCY_NAME | default: "Agency OS"}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Project Status Changed',
    subject: 'Project Status Update: {{params.PROJECT_NAME}}',
    key: 'PROJECT_STATUS_CHANGED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .status-badge { display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #d97706; border-radius: 9999px; font-weight: 600; font-size: 14px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Status Updated</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>The status of your project <strong>{{params.PROJECT_NAME}}</strong> has been updated.</p>
      <p>
        Old Status: <span class="status-badge">{{params.OLD_STATUS}}</span><br>
        New Status: <span class="status-badge" style="background-color: #F59E0B; color: white;">{{params.NEW_STATUS}}</span>
      </p>
      <p>{{params.STATUS_MESSAGE}}</p>
      <center><a href="{{params.PROJECT_LINK}}" class="button">View Project</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Project Completed',
    subject: 'Project Completed: {{params.PROJECT_NAME}}',
    key: 'PROJECT_COMPLETED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Completed! 🎉</h1>
    </div>
    <div class="content">
      <p>Hello {{params.RECIPIENT_NAME}},</p>
      <p>Great news! The project <strong>{{params.PROJECT_NAME}}</strong> has been successfully completed.</p>
      <p>Thank you for choosing us for your project needs. We look forward to working with you again!</p>
      <center><a href="{{params.PROJECT_LINK}}" class="button">View Final Project</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Task Assigned',
    subject: 'New Task Assigned: {{params.TASK_TITLE}}',
    key: 'TASK_ASSIGNED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Task Assigned</h1>
    </div>
    <div class="content">
      <p>Hello {{params.ASSIGNEE_NAME}},</p>
      <p>You have been assigned a new task in <strong>{{params.PROJECT_NAME}}</strong>.</p>
      <p><strong>Task:</strong> {{params.TASK_TITLE}}</p>
      <p><strong>Priority:</strong> {{params.PRIORITY}}</p>
      <p><strong>Due Date:</strong> {{params.DUE_DATE}}</p>
      <p><em>{{params.TASK_DESCRIPTION}}</em></p>
      <center><a href="{{params.TASK_LINK}}" class="button">View Task</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Task Status Changed',
    subject: 'Task Status Update: {{params.TASK_TITLE}}',
    key: 'TASK_STATUS_CHANGED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Task Status Update</h1>
    </div>
    <div class="content">
      <p>Hello {{params.RECIPIENT_NAME}},</p>
      <p>The status of task <strong>{{params.TASK_TITLE}}</strong> has been updated by {{params.UPDATED_BY}}.</p>
      <p>
        Old Status: <strong>{{params.OLD_STATUS}}</strong><br>
        New Status: <strong>{{params.NEW_STATUS}}</strong>
      </p>
      <center><a href="{{params.TASK_LINK}}" class="button">View Task</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Task Comment Added',
    subject: 'New Comment on Task: {{params.TASK_TITLE}}',
    key: 'TASK_COMMENT_ADDED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .comment-box { background-color: #fffbeb; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0; font-style: italic; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Comment</h1>
    </div>
    <div class="content">
      <p><strong>{{params.COMMENTER_NAME}}</strong> commented on task <strong>{{params.TASK_TITLE}}</strong>:</p>
      <div class="comment-box">
        "{{params.COMMENT_TEXT}}"
      </div>
      <center><a href="{{params.TASK_LINK}}" class="button">Reply to Comment</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Invoice Created',
    subject: 'New Invoice Received: {{params.PROJECT_NAME}}',
    key: 'INVOICE_CREATED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .amount { font-size: 32px; font-weight: bold; color: #F59E0B; text-align: center; margin: 20px 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Invoice</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>A new invoice has been generated for project <strong>{{params.PROJECT_NAME}}</strong>.</p>
      <div class="amount">₹{{params.AMOUNT}}</div>
      <p style="text-align: center;">Due Date: {{params.DUE_DATE}}</p>
      <center><a href="{{params.FINANCE_LINK}}" class="button">Pay Now</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Payment Pending Approval',
    subject: 'Payment Pending Approval: {{params.PROJECT_NAME}}',
    key: 'PAYMENT_PENDING_APPROVAL',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Verification Needed</h1>
    </div>
    <div class="content">
      <p>Hello Admin,</p>
      <p><strong>{{params.CLIENT_NAME}}</strong> has submitted a payment of <strong>₹{{params.AMOUNT}}</strong> for project <strong>{{params.PROJECT_NAME}}</strong>.</p>
      <p>Please review and approve this transaction.</p>
      <center><a href="{{params.FINANCE_LINK}}" class="button">Review Payment</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Payment Approved',
    subject: 'Payment Approved: {{params.PROJECT_NAME}}',
    key: 'PAYMENT_APPROVED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Approved ✅</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>Your payment of <strong>₹{{params.AMOUNT}}</strong> for project <strong>{{params.PROJECT_NAME}}</strong> has been successfully approved.</p>
      <p>Thank you for your prompt payment!</p>
      <center><a href="{{params.FINANCE_LINK}}" class="button">View Receipt</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Payment Rejected',
    subject: 'Action Required: Payment Rejected for {{params.PROJECT_NAME}}',
    key: 'PAYMENT_REJECTED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #ef4444; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Rejected ⚠️</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>Your payment of <strong>₹{{params.AMOUNT}}</strong> for project <strong>{{params.PROJECT_NAME}}</strong> was not approved.</p>
      <p><strong>Reason:</strong> {{params.REJECTION_REASON}}</p>
      <p>Please check the details and try again.</p>
      <center><a href="{{params.FINANCE_LINK}}" class="button">Try Again</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Leave Requested',
    subject: 'Leave Request: {{params.EMPLOYEE_NAME}}',
    key: 'LEAVE_REQUESTED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Leave Request</h1>
    </div>
    <div class="content">
      <p>Hello Admin,</p>
      <p><strong>{{params.EMPLOYEE_NAME}}</strong> has requested leave.</p>
      <ul>
        <li>Type: {{params.LEAVE_TYPE}}</li>
        <li>From: {{params.START_DATE}}</li>
        <li>To: {{params.END_DATE}}</li>
        <li>Duration: {{params.DAYS}} day(s)</li>
        <li>Reason: {{params.REASON}}</li>
      </ul>
      <center><a href="{{params.TEAM_LINK}}" class="button">Review Request</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Leave Approved',
    subject: 'Leave Approved ✅',
    key: 'LEAVE_APPROVED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Leave Request Approved</h1>
    </div>
    <div class="content">
      <p>Hello {{params.EMPLOYEE_NAME}},</p>
      <p>Your leave request for <strong>{{params.DAYS}} day(s)</strong> ({{params.START_DATE}} to {{params.END_DATE}}) has been approved by {{params.APPROVED_BY}}.</p>
      <p>Enjoy your break!</p>
      <center><a href="{{params.TEAM_LINK}}" class="button">View Schedule</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Leave Rejected',
    subject: 'Leave Request Update',
    key: 'LEAVE_REJECTED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #ef4444; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Leave Request Not Approved</h1>
    </div>
    <div class="content">
      <p>Hello {{params.EMPLOYEE_NAME}},</p>
      <p>Your leave request ({params.START_DATE}} to {{params.END_DATE}}) has not been approved.</p>
      <p><strong>Reason:</strong> {{params.REJECTION_REASON}}</p>
      <p>Please contact your manager for more details.</p>
      <center><a href="{{params.TEAM_LINK}}" class="button">View Status</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Leave Cancelled',
    subject: 'Leave Cancelled: {{params.EMPLOYEE_NAME}}',
    key: 'LEAVE_CANCELLED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #9ca3af; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #9ca3af; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Leave Request Cancelled</h1>
    </div>
    <div class="content">
      <p>Hello Admin,</p>
      <p><strong>{{params.EMPLOYEE_NAME}}</strong> has cancelled their leave request for <strong>{{params.LEAVE_TYPE}}</strong>.</p>
      <center><a href="{{params.TEAM_LINK}}" class="button">View Schedule</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Salary Paid',
    subject: 'Payslip Available: {{params.MONTH}}',
    key: 'SALARY_PAID',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Salary Disbursed</h1>
    </div>
    <div class="content">
      <p>Hello {{params.EMPLOYEE_NAME}},</p>
      <p>Your salary of <strong>₹{{params.AMOUNT}}</strong> for the month of <strong>{{params.MONTH}}</strong> has been processed on {{params.PAYMENT_DATE}}.</p>
      <center><a href="{{params.FINANCE_LINK}}" class="button">View Payslip</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Refund Issued',
    subject: 'Refund Processed: {{params.PROJECT_NAME}}',
    key: 'REFUND_ISSUED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Refund Issued</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>A refund of <strong>₹{{params.AMOUNT}}</strong> has been issued for the project <strong>{{params.PROJECT_NAME}}</strong>.</p>
      <p><strong>Reason:</strong> {{params.REFUND_REASON}}</p>
      <center><a href="{{params.PROJECT_LINK}}" class="button">View Details</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Document Update Requested',
    subject: 'Document Update Required: {{params.EMPLOYEE_NAME}}',
    key: 'DOCUMENT_UPDATE_REQUESTED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Required: Document Update</h1>
    </div>
    <div class="content">
      <p>Hello Admin,</p>
      <p><strong>{{params.EMPLOYEE_NAME}}</strong> has submitted a new <strong>{{params.DOCUMENT_TYPE}}</strong> for verification.</p>
      <center><a href="{{params.TEAM_LINK}}" class="button">Review Document</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Document Update Response',
    subject: 'Document Update Status: {{params.DOCUMENT_TYPE}}',
    key: 'DOCUMENT_UPDATE_RESPONSE',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Document {{params.STATUS}}</h1>
    </div>
    <div class="content">
      <p>Hello {{params.EMPLOYEE_NAME}},</p>
      <p>Your submitted <strong>{{params.DOCUMENT_TYPE}}</strong> has been <strong>{{params.STATUS}}</strong>.</p>
      <center><a href="{{params.PROFILE_LINK}}" class="button">View Profile</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Client Account Created',
    subject: 'Welcome to {{params.AGENCY_NAME}}!',
    key: 'CLIENT_ACCOUNT_CREATED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .credentials { background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome Aboard! 🎉</h1>
    </div>
    <div class="content">
      <p>Hello {{params.CLIENT_NAME}},</p>
      <p>Welcome to <strong>{{params.AGENCY_NAME}}</strong>! Your client account has been created successfully.</p>
      <p>Here are your login credentials:</p>
      <div class="credentials">
        <p><strong>Username:</strong> {{params.USERNAME}}</p>
        <p><strong>Password:</strong> {{params.PASSWORD}}</p>
      </div>
      <p><em>Please change your password after your first login.</em></p>
      <center><a href="{{params.DASHBOARD_LINK}}" class="button">Login to Dashboard</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Employee Account Created',
    subject: 'Welcome to the Team, {{params.EMPLOYEE_NAME}}!',
    key: 'EMPLOYEE_ACCOUNT_CREATED',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
  .header { background-color: #F59E0B; padding: 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; color: #374151; line-height: 1.6; }
  .button { display: inline-block; background-color: #F59E0B; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  .credentials { background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to the Team! 🚀</h1>
    </div>
    <div class="content">
      <p>Hello {{params.EMPLOYEE_NAME}},</p>
      <p>Welcome to <strong>{{params.AGENCY_NAME}}</strong>! Your employee account has been set up with the role: <strong>{{params.ROLE}}</strong>.</p>
      <p>Here are your login credentials:</p>
      <div class="credentials">
        <p><strong>Username:</strong> {{params.USERNAME}}</p>
        <p><strong>Password:</strong> {{params.PASSWORD}}</p>
      </div>
      <p><em>Please change your password after your first login.</em></p>
      <center><a href="{{params.DASHBOARD_LINK}}" class="button">Login to Dashboard</a></center>
    </div>
    <div class="footer">
      <p>&copy; Agency OS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
  }
];

async function createTemplates() {
  const resultMapping = {};
  
  for (const template of templates) {
    try {
      console.log(`Creating template: ${template.name}...`);
      
      const response = await fetch('https://api.brevo.com/v3/smtp/templates', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          sender: sender,
          templateName: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          isActive: true
        })
      });
      
      if (!response.ok) {
        console.error(`Failed to create ${template.name}:`, await response.text());
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Created ${template.name} (ID: ${data.id})`);
      resultMapping[template.key] = data.id;
      
    } catch (error) {
      console.error(`Error creating ${template.name}:`, error);
    }
  }
  
  console.log('\n\n--- TEMPLATE ID MAPPING ---');
  console.log(JSON.stringify(resultMapping, null, 2));
}

createTemplates();
