
import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server verification failed:', error);
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
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #667eea;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    h1 {
      color: #667eea;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .greeting {
      font-size: 18px;
      color: #555;
      margin-bottom: 20px;
    }
    .content {
      margin: 20px 0;
      color: #555;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 5px;
    }
    .info-box h2 {
      color: #667eea;
      font-size: 18px;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .info-item {
      margin: 10px 0;
      padding-left: 20px;
    }
    .info-item strong {
      color: #333;
      display: inline-block;
      width: 140px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #777;
      font-size: 14px;
    }
    .footer-logo {
      font-size: 20px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .contact-info {
      margin: 15px 0;
    }
    .contact-info p {
      margin: 5px 0;
    }
    .signature {
      margin-top: 30px;
      font-style: italic;
      color: #555;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">TRANSMONK</div>
      <p style="margin: 0; color: #777;">Advanced HVAC Solutions</p>
    </div>

    <p class="greeting">Dear <strong>${name}</strong>,</p>

    <div class="content">
      <p>
        Thank you for visiting the <strong>Transmonk booth</strong> at the exhibition. 
        It was a pleasure interacting with you and learning about your organization, 
        <strong>${organization}</strong>.
      </p>

      <p>
        As discussed, Transmonk specializes in providing advanced and reliable solutions 
        designed to improve efficiency, performance, and long-term operational value. 
        We are excited about the possibility of working together and helping your 
        organization achieve its goals.
      </p>
    </div>

    <div class="info-box">
      <h2>Your Shared Details</h2>
      <div class="info-item">
        <strong>Name:</strong> ${name}
      </div>
      <div class="info-item">
        <strong>Contact Number:</strong> ${phone}
      </div>
      <div class="info-item">
        <strong>Email:</strong> ${email}
      </div>
      <div class="info-item">
        <strong>Organization:</strong> ${organization}
      </div>
    </div>

    <div class="content">
      <p>
        Our team will review your requirements and connect with you shortly to provide 
        relevant information, product details, or a personalized demonstration based 
        on your needs.
      </p>

      <p>
        If you have any immediate questions or would like to schedule a meeting, 
        please feel free to reply to this email.
      </p>

      <p>
        We sincerely appreciate your time and interest in Transmonk and look forward 
        to building a successful partnership.
      </p>
    </div>

    <p class="signature">
      Warm Regards,<br>
      <strong>Transmonk Team</strong>
    </p>

    <div class="footer">
      <div class="footer-logo">TRANSMONK</div>
      <div class="contact-info">
        <p><strong>Website:</strong> <a href="${process.env.COMPANY_WEBSITE}">${process.env.COMPANY_WEBSITE}</a></p>
        <p><strong>Phone:</strong> ${process.env.COMPANY_PHONE}</p>
        <p><strong>Address:</strong> ${process.env.COMPANY_ADDRESS}</p>
      </div>
    </div>
  </div>
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

  console.log('✅ Email sent:', info.messageId);
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

  console.log('✅ Internal notification sent:', info.messageId);
  return info;
}