import nodemailer from "nodemailer";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("✅ Email server is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email server verification failed:", error);
    return false;
  }
}

interface EmailData {
  name: string;
  email: string;
  phone: string;
  organization: string;
}

export async function sendConfirmationEmail(data: EmailData) {
  const { name, email, phone, organization } = data;

  // Email subject
  const subject = `ACREX 2026: Next Steps with Transmonk HVAC Solutions`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transmonk Follow-up</title>
  <style>
    @media only screen and (max-width: 600px) {
      .outer-wrapper {
        padding: 20px 16px !important;
      }
      .body-cell {
        padding: 30px 20px !important;
      }
      .detail-cell {
        padding: 16px !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f7f6; font-family:Arial, Helvetica, sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed; background-color:#f4f7f6; padding:40px 20px;" class="outer-wrapper">
    <tr>
      <td align="center">

        <!-- Main content table -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#003366; padding:30px 20px;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">TRANSMONK</h1>
              <p style="color:#a8c5e8; margin:5px 0 0 0; font-size:14px; font-style:italic;">Simply Precise</p>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td class="body-cell" style="padding:40px 30px; color:#333333; line-height:1.6; font-size:16px;">

              <p style="margin-top:0;">Dear <strong>${name}</strong>,</p>

              <p>Thank you for visiting the Transmonk booth at ACREX 2026. It was a pleasure to connect with you, and we appreciate you taking the time to interact with our voice agent, Riya, to share your details.</p>

              <p>At Transmonk, we believe in being <em>"Simply Precise."</em> Our team is currently reviewing the information you provided regarding your interest in our HVAC and energy-efficient fan solutions. To ensure we deliver the most optimized guidance for your application, one of our techno-commercial engineers will follow up with you within the next seven business days to discuss your specific requirements and share personalized recommendations.</p>

              <p>While our team prepares your customized solution, we invite you to explore our engineering capabilities, case studies, and EC motor technology by visiting our website.</p>

              <!-- Call to action button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.transmonk.in/" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#0055a4; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:4px; font-size:16px;">Explore Transmonk Solutions</a>
                  </td>
                </tr>
              </table>

              <!-- Warning / Note box -->
              <div style="background-color:#fff3cd; border-left:4px solid #ffc107; padding:15px; margin:30px 0; font-size:14px; color:#665c00;">
                <strong>Please note:</strong> This is an automated message. Kindly do not reply to this email. For any immediate questions or further technical inquiries, please reach out to our team directly at <a href="mailto:info@transmonk.in" style="color:#0055a4; text-decoration:underline; font-weight:bold;">info@transmonk.in</a>.
              </div>

              <p>Thank you again for your time and interest. We look forward to helping you reduce energy bills and carbon footprints with our smart solutions shortly.</p>

              <p style="margin-bottom:0;">Sincerely,<br>
                <strong>The Transmonk Team</strong><br>
                <span style="font-size:14px; color:#777777; font-style:italic;">Simply Precise</span>
              </p>

              <!-- Shared Details Info Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8f9fa; border-left:4px solid #000; margin-top:25px; border-radius:5px;">
                <tr>
                  <td class="detail-cell" style="padding:20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:18px; font-weight:bold; color:#000; padding-bottom:15px;">
                          Your Shared Details
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <strong style="display:inline-block; width:160px; color:#333;">Name:</strong> ${name}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <strong style="display:inline-block; width:160px; color:#333;">Contact Number:</strong> ${phone}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <strong style="display:inline-block; width:160px; color:#333;">Email:</strong> ${email}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <strong style="display:inline-block; width:160px; color:#333;">Organization:</strong> ${organization}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#f8f9fa; padding:20px; border-top:1px solid #eeeeee; font-size:12px; color:#888888;">
              <p style="margin:0;">&copy; 2026 Transmonk India Pvt. Ltd. All Rights Reserved.</p>
              <p style="margin:5px 0 0 0;">GAT No. 679/2/2, Alandi-Chakan Road, Alandi Phata, Kuruli, Maharashtra-410501</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`.trim();

  // Send email
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: htmlContent,
  });

  console.log("✅ Email sent:", info.messageId);
  return info;
}

// Optional: Send internal notification to your team
export async function sendInternalNotification(data: EmailData) {
  const { name, email, phone, organization } = data;

  const internalEmail = `
New Lead from Exhibition Booth!

Customer Details:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Organization: ${organization}

Action Required: Follow up within 24 hours.
  `.trim();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER, // Send to yourself
    subject: `New Lead: ${name} from ${organization}`,
    text: internalEmail,
  });

  console.log("✅ Internal notification sent:", info.messageId);
  return info;
}
