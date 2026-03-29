import nodemailer from 'nodemailer';

/**
 * Create reusable transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false, // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send an email
 * @param {Object} options - { to, subject, text, html }
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"PayMatrix" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email send failed: ${error.message}`);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetUrl) => {
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #131313; color: #e5e2e1; padding: 40px; border-radius: 16px;">
      <h1 style="font-family: 'Manrope', sans-serif; color: #ffffff; margin-bottom: 24px;">PayMatrix</h1>
      <h2 style="color: #c6c6c6; font-weight: 400;">Password Reset Request</h2>
      <p style="color: #919191; line-height: 1.6;">
        You requested a password reset. Click the button below to reset your password.
        This link will expire in 10 minutes.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #ffffff; color: #1a1c1c; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
        Reset Password
      </a>
      <p style="color: #474747; font-size: 12px; margin-top: 32px;">
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'PayMatrix — Password Reset',
    text: `Reset your password: ${resetUrl}`,
    html,
  });
};
