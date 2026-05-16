import { isContactUsEmailEnabled } from "./email-policy";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Send a transactional email through Brevo's REST API.
 */
async function sendBrevoTransactionalEmail(payload) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set in environment variables");
  }

  if (!(await isContactUsEmailEnabled())) {
    console.warn("Brevo contact email skipped because contact us emails are disabled.");
    return { skipped: true };
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseBody = null;
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    const details =
      typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    throw new Error(`Brevo API returned ${response.status}: ${details}`);
  }

  return responseBody || {};
}

function getContactSender() {
  const email =
    process.env.DC_CONTACT_SENDER_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.ADMIN_EMAIL;
  const name =
    process.env.DC_CONTACT_SENDER_NAME ||
    process.env.BREVO_SENDER_NAME ||
    "Digital Corvids";

  if (!email) {
    throw new Error(
      "DC_CONTACT_SENDER_EMAIL, BREVO_SENDER_EMAIL, or ADMIN_EMAIL must be set in environment variables"
    );
  }

  return { email, name };
}

function getContactAdminEmail(sender) {
  return process.env.DC_CONTACT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || sender.email;
}

function getContactReplyTo(sender) {
  const email =
    process.env.DC_CONTACT_REPLY_TO_EMAIL ||
    process.env.DC_CONTACT_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    sender.email;
  const name =
    process.env.DC_CONTACT_REPLY_TO_NAME ||
    process.env.DC_CONTACT_SENDER_NAME ||
    process.env.BREVO_SENDER_NAME ||
    "Digital Corvids";

  return { email, name };
}

/**
 * Send thank you email to user who submitted the contact form
 */
export async function sendUserThankYouEmail(userData) {
  const { fullName, email } = userData;
  const sender = getContactSender();
  const safeFullName = escapeHtml(fullName);

  const sendSmtpEmail = {
    subject: "Thank You for Contacting Digital Corvids!",
    to: [{ email, name: fullName }],
    sender,
    replyTo: getContactReplyTo(sender),
    htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #F5EE30; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .content h2 { color: #000000; margin-top: 0; }
        .highlight { color: #F5EE30; background: #000000; padding: 2px 8px; border-radius: 3px; font-weight: bold; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .cta-button { display: inline-block; background: #F5EE30; color: #000000; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="header"><h1>Digital Corvids</h1></div>
      <div class="content">
        <h2>Hello ${safeFullName}! 👋</h2>
        <p>Thank you for reaching out to <span class="highlight">Digital Corvids</span>!</p>
        <p>We've received your message and our team is already reviewing it.</p>
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our team will review your inquiry within 24 hours</li>
          <li>We'll get back to you with a personalized response</li>
          <li>Together, we'll discuss the best solutions for your needs</li>
        </ul>
        <center><a href="https://digitalcorvids.com" class="cta-button">Visit Our Website</a></center>
        <p>If you have any urgent questions, reach out at <strong>flytheraven@digitalcorvids.com</strong> or call us at <strong>+91-8003177679</strong>.</p>
        <p><strong>Best regards,</strong><br>The Digital Corvids Team</p>
      </div>
      <div class="footer">
        <p>Digital Corvids | Malviya Nagar, Jaipur, Rajasthan</p>
        <p>flytheraven@digitalcorvids.com | +91-8003177679</p>
      </div>
    </body>
    </html>
  `,
  };

  try {
    const response = await sendBrevoTransactionalEmail(sendSmtpEmail);
    console.log("User thank you email sent successfully:", response);
    return { success: true, messageId: response?.messageId };
  } catch (error) {
    console.error("Error sending user thank you email:", error);
    throw new Error(`Failed to send thank you email: ${error.message}`);
  }
}

/**
 * Send notification email to admin with contact form details
 */
export async function sendAdminNotificationEmail(formData) {
  const { fullName, email, phone, companyName, message } = formData;
  const sender = getContactSender();
  const adminEmail = getContactAdminEmail(sender);
  const safeFullName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeCompanyName = escapeHtml(companyName);
  const safeMessage = escapeHtml(message);

  const sendSmtpEmail = {
    subject: `New Contact Form Submission from ${fullName}`,
    to: [{ email: adminEmail, name: "Admin" }],
    sender,
    replyTo: { email, name: fullName },
    htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #F5EE30; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
        .content { padding: 30px; }
        .alert { background: #fff3cd; border-left: 4px solid #F5EE30; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 12px; border-bottom: 1px solid #e0e0e0; }
        .info-table td:first-child { font-weight: bold; width: 150px; color: #000000; background: #f9f9f9; }
        .message-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin: 15px 0; white-space: pre-wrap; }
        .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🔔 New Contact Form Submission</h1></div>
        <div class="content">
          <div class="alert"><strong>⚡ Action Required:</strong> A new contact form has been submitted.</div>
          <h3 style="color: #000000; border-bottom: 2px solid #F5EE30; padding-bottom: 10px;">Contact Details</h3>
          <table class="info-table">
            <tr><td>Full Name</td><td>${safeFullName}</td></tr>
            <tr><td>Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><td>Phone</td><td><a href="tel:${safePhone}">${safePhone}</a></td></tr>
            ${companyName ? `<tr><td>Company</td><td>${safeCompanyName}</td></tr>` : ""}
          </table>
          <h3 style="color: #000000; border-bottom: 2px solid #F5EE30; padding-bottom: 10px;">Message</h3>
          <div class="message-box">${safeMessage}</div>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <strong>Next Steps:</strong><br>Please respond within 24 hours.
          </p>
        </div>
        <div class="footer"><p>Automated notification from Digital Corvids Contact Form</p></div>
      </div>
    </body>
    </html>
  `,
  };

  try {
    const response = await sendBrevoTransactionalEmail(sendSmtpEmail);
    console.log("Admin notification email sent successfully:", response);
    return { success: true, messageId: response?.messageId };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    throw new Error(`Failed to send admin notification: ${error.message}`);
  }
}
