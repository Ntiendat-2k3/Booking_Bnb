const nodemailer = require("nodemailer");

/**
 * Build SMTP transporter from env vars.
 * Falls back to a no-op transport that logs to console when SMTP is not configured.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[Mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will only be logged to console.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transporter = createTransporter();

/**
 * Send an email. Gracefully falls back to console logging when SMTP is not configured.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.log(`[Mailer] (no SMTP) To: ${to} | Subject: ${subject}`);
    return null;
  }

  try {
    const from = process.env.SMTP_FROM || `"Booking BnB" <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log("[Mailer] Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("[Mailer] Error sending email:", error);
    return null;
  }
};

module.exports = {
  transporter,
  sendEmail,
};
