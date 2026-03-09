/**
 * Brevo (Sendinblue) transactional email utility.
 * Uses the Brevo REST API v3 to send emails.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailOptions {
    to: string;
    toName?: string;
    subject: string;
    htmlContent: string;
}

export async function sendEmail({ to, toName, subject, htmlContent }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || "Digital Corvids";

    if (!apiKey || !senderEmail) {
        console.error("Brevo: Missing API key or sender email in .env");
        return { success: false, error: "Email service not configured" };
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: [{ email: to, name: toName || to }],
                subject,
                htmlContent,
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Brevo API error:", response.status, errBody);
            return { success: false, error: "Failed to send email" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Brevo send error:", error);
        return { success: false, error: error.message || "Email send failed" };
    }
}

/**
 * Send OTP verification email for signup.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
    return sendEmail({
        to: email,
        subject: `Your Verification Code: ${otp}`,
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,sans-serif;">
    <div style="max-width:500px;margin:40px auto;background:#0a0a0a;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <div style="background:#111;padding:30px;text-align:center;border-bottom:1px solid #222;">
            <span style="color:#F5EE30;font-size:36px;font-weight:bold;letter-spacing:2px;">DC</span>
            <p style="color:#888;font-size:13px;margin:8px 0 0;">Digital Corvids</p>
        </div>
        
        <!-- Body -->
        <div style="padding:30px 30px 20px;">
            <h2 style="color:#fff;margin:0 0 10px;font-size:20px;">Verify Your Email</h2>
            <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 25px;">
                Enter this code to complete your signup:
            </p>
            
            <!-- OTP Code -->
            <div style="background:#111;border:2px solid #F5EE30;border-radius:8px;padding:20px;text-align:center;margin:0 0 25px;">
                <span style="color:#F5EE30;font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</span>
            </div>
            
            <p style="color:#666;font-size:12px;line-height:1.5;margin:0;">
                This code expires in <strong style="color:#999;">5 minutes</strong>. 
                If you didn't request this, ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="padding:15px 30px;border-top:1px solid #222;text-align:center;">
            <p style="color:#555;font-size:11px;margin:0;">© Digital Corvids — Strategic Birds of the Digital Sky</p>
        </div>
    </div>
</body>
</html>`,
    });
}
