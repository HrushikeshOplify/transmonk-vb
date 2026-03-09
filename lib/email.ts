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
  const subject = `Strategic Alignment: Transmonk & ${organization} | Mumbai Exhibition Follow-up`;

  // Plain text version
  const textContent = `
Dear ${name},

Thank you for visiting the Transmonk booth at the exhibition. It was a pleasure interacting with you and learning about your organization, ${organization}.

As discussed, Transmonk specializes in providing advanced and reliable solutions designed to improve efficiency, performance, and long-term operational value. We are excited about the possibility of working together and helping your organization achieve its goals.

YOUR SHARED DETAILS:
- Name: ${name}
- Contact Number: ${phone}
- Email: ${email}
- Organization: ${organization}

Our team will review your requirements and connect with you shortly to provide relevant information, product details, or a personalized demonstration based on your needs.

If you have any immediate questions or would like to schedule a meeting, please feel free to reply to this email.

We sincerely appreciate your time and interest in Transmonk and look forward to building a successful partnership.

Warm Regards,
Transmonk Team

Website: ${process.env.COMPANY_WEBSITE}
Phone: ${process.env.COMPANY_PHONE}
Address: ${process.env.COMPANY_ADDRESS}
  `.trim();

  // HTML version (prettier)
  //   const htmlContent = `
  // <!DOCTYPE html>
  // <html>
  // <head>
  //   <meta charset="UTF-8">
  //   <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //   <style>
  //     body {
  //       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  //       line-height: 1.6;
  //       color: #333;
  //       max-width: 600px;
  //       margin: 0 auto;
  //       padding: 20px;
  //       background-color: #f5f5f5;
  //     }
  //     .container {
  //       background-color: white;
  //       border-radius: 10px;
  //       padding: 40px;
  //       box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  //     }
  //     .header {
  //       text-align: center;
  //       margin-bottom: 30px;
  //       padding-bottom: 20px;
  //       border-bottom: 3px solid #000;
  //     }
  //     .logo {
  //       font-size: 32px;
  //       font-weight: bold;
  //       color: #000;
  //       margin-bottom: 10px;
  //     }
  //     h1 {
  //       color: #000;
  //       font-size: 24px;
  //       margin-bottom: 20px;
  //     }
  //     .greeting {
  //       font-size: 18px;
  //       color: #555;
  //       margin-bottom: 20px;
  //     }
  //     .content {
  //       margin: 20px 0;
  //       color: #555;
  //     }
  //     .info-box {
  //       background-color: #f8f9fa;
  //       border-left: 4px solid #000;
  //       padding: 20px;
  //       margin: 25px 0;
  //       border-radius: 5px;
  //     }
  //     .info-box h2 {
  //       color: #000;
  //       font-size: 18px;
  //       margin-top: 0;
  //       margin-bottom: 15px;
  //     }
  //     .info-item {
  //       margin: 10px 0;
  //       padding-left: 20px;
  //     }
  //     .info-item strong {
  //       color: #333;
  //       display: inline-block;
  //       width: 160px;
  //     }
  //     .highlight-box {
  //       background-color: #f0f0f0;
  //       border-left: 4px solid #555;
  //       padding: 15px 20px;
  //       margin: 20px 0;
  //       border-radius: 5px;
  //       color: #444;
  //     }
  //     .footer {
  //       margin-top: 40px;
  //       padding-top: 20px;
  //       border-top: 2px solid #e0e0e0;
  //       text-align: center;
  //       color: #777;
  //       font-size: 14px;
  //     }
  //     .footer-logo {
  //       font-size: 20px;
  //       font-weight: bold;
  //       color: #000;
  //       margin-bottom: 10px;
  //     }
  //     .contact-info {
  //       margin: 15px 0;
  //     }
  //     .contact-info p {
  //       margin: 5px 0;
  //     }
  //     .signature {
  //       margin-top: 30px;
  //       font-style: italic;
  //       color: #555;
  //     }
  //     a {
  //       color: #000;
  //       text-decoration: none;
  //     }
  //     a:hover {
  //       text-decoration: underline;
  //     }

  //   </style>
  // </head>
  // <body>
  //   <div class="container">
  //     <div class="header">
  //       <div class="logo">TRANSMONK</div>
  //       <p style="margin: 0; color: #777;">Advanced HVAC Solutions</p>
  //     </div>

  //     <p class="greeting">Dear <strong>${name}</strong>,</p>

  //     <div class="content">
  //       <p>
  //         It was a privilege to host you at the <strong>Transmonk booth</strong> during the recent
  //         <strong>Mumbai exhibition</strong>. We greatly value the time you spent interacting with
  //         our voice agent to explore our industrial solutions.
  //       </p>

  //       <p>
  //         At Transmonk, our philosophy is simple: delivering <strong>"Make in India" excellence</strong>
  //         that translates into measurable operational efficiency and long-term asset value for our partners.
  //         We are genuinely excited about the synergy between our capabilities and the goals of
  //         <strong>${organization}</strong>.
  //       </p>

  //       <p>
  //         To ensure your specific requirements are addressed with the technical depth they deserve,
  //         we have aligned our Regional Sales Manager to your account for direct support:
  //       </p>
  //     </div>

  //     <div class="highlight-box">
  //       <strong>Regional Manager:</strong> Suraj Prajapati<br>
  //       <strong>Contact:</strong> +91 70835 97649 &nbsp;|&nbsp;
  //       <a href="mailto:hrushikeshn63@gmail.com">hrushikeshn63@gmail.com</a>
  //     </div>

  //     <!-- Your Shared Details Card — preserved -->
  // <div class="info-box">
  //   <h2>Your Shared Details</h2>
  //   <div class="info-item">
  //     <strong>Name:</strong>${name}
  //   </div>
  //   <div class="info-item">
  //     <strong>Contact Number:</strong> ${phone}
  //   </div>
  //   <div class="info-item">
  //     <strong>Email:</strong> ${email}
  //   </div>
  //   <div class="info-item">
  //     <strong>Organization:</strong> ${organization}
  //   </div>
  // </div>

  //     <div class="content">
  //       <p>
  //         Please rest assured that our team will personally reach out to you within the
  //         <strong>next 10 business days</strong> to continue this dialogue and define the next steps.
  //       </p>

  //       <p>
  //         We look forward to a valuable partnership.
  //       </p>
  //     </div>

  //     <p class="signature">
  //       Warm regards,<br>
  //       <strong>Deepak</strong> — AI Voice Agent<br>
  //       Technical Sales Team | Transmonk India Pvt. Ltd.
  //     </p>

  //     <div class="footer">
  //       <div class="footer-logo">TRANSMONK</div>
  //       <div class="contact-info">
  //         <p><strong>Website:</strong> <a href="https://www.transmonk.in">www.transmonk.in</a></p>
  //       </div>
  //     </div>
  //   </div>
  // </body>
  // </html>
  //   `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transmonk Follow-up</title>
    </head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f7f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td align="center" style="background-color: #003366; padding: 30px 20px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">TRANSMONK</h1>
                            <p style="color: #a8c5e8; margin: 5px 0 0 0; font-size: 14px; font-style: italic;">Simply Precise</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px;">
                            
                            <p style="margin-top: 0;">Dear <strong>${name}</strong>,</p>
                            
                            <p>Thank you for visiting the Transmonk booth at ACREX 2026. It was a pleasure to connect with you, and we appreciate you taking the time to interact with our voice agent, Riya, to share your details.</p>
                            
                            <p>At Transmonk, we believe in being <em>"Simply Precise."</em> Our team is currently reviewing the information you provided regarding your interest in our HVAC and energy-efficient fan solutions. To ensure we deliver the most optimized guidance for your application, one of our techno-commercial engineers will follow up with you within the next seven business days to discuss your specific requirements and share personalized recommendations.</p>
                            
                            <p>While our team prepares your customized solution, we invite you to explore our engineering capabilities, case studies, and EC motor technology by visiting our website.</p>
                            
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://www.transmonk.in/" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0055a4; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 16px;">Explore Transmonk Solutions</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; font-size: 14px; color: #665c00;">
                                <strong>Please note:</strong> This is an automated message. Kindly do not reply to this email. For any immediate questions or further technical inquiries, please reach out to our team directly at <a href="mailto:info@transmonk.in" style="color: #0055a4; text-decoration: underline; font-weight: bold;">info@transmonk.in</a>.
                            </div>

                            <p>Thank you again for your time and interest. We look forward to helping you reduce energy bills and carbon footprints with our smart solutions shortly.</p>
                            
                            <p style="margin-bottom: 0;">Sincerely,<br>
                            <strong>The Transmonk Team</strong><br>
                            <span style="font-size: 14px; color: #777777; font-style: italic;">Simply Precise</span></p>

                              <!-- Your Shared Details Card -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8f9fa;border-left:4px solid #000;padding:20px;margin-top:25px;border-radius:5px;">
  
  <tr>
    <td style="font-size:18px;font-weight:bold;color:#000;padding-bottom:15px;">
      Your Shared Details
    </td>
  </tr>

  <tr>
    <td style="padding:6px 0;">
      <strong style="display:inline-block;width:160px;color:#333;">Name:</strong> ${name}
    </td>
  </tr>

  <tr>
    <td style="padding:6px 0;">
      <strong style="display:inline-block;width:160px;color:#333;">Contact Number:</strong> ${phone}
    </td>
  </tr>

  <tr>
    <td style="padding:6px 0;">
      <strong style="display:inline-block;width:160px;color:#333;">Email:</strong> ${email}
    </td>
  </tr>

  <tr>
    <td style="padding:6px 0;">
      <strong style="display:inline-block;width:160px;color:#333;">Organization:</strong> ${organization}
    </td>
  </tr>

</table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #f8f9fa; padding: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888;">
                            <p style="margin: 0;">&copy; 2026 Transmonk India Pvt. Ltd. All Rights Reserved.</p>
                            <p style="margin: 5px 0 0 0;">GAT No. 679/2/2, Alandi-Chakan Road, Alandi Phata, Kuruli, Maharashtra-4010501</p>
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
    text: textContent,
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
