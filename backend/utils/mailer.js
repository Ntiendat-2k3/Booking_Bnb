const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[Mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will only be logged to console.",
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 5000,
    socketTimeout: 5000,
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
  try {
    if (process.env.GAS_MAIL_URL) {
      const resp = await fetch(process.env.GAS_MAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
      });
      const data = await resp.json();
      if (data.status === "success") {
        console.log("[Mailer] Email sent successfully via Google Apps Script");
        return { messageId: "GAS-" + Date.now() };
      } else {
        throw new Error(data.message || "Unknown error from GAS");
      }
    }

    if (!transporter) {
      console.log(`[Mailer] (no SMTP) To: ${to} | Subject: ${subject}`);
      return null;
    }

    const from =
      process.env.SMTP_FROM || `"Booking BnB" <${process.env.SMTP_USER}>`;
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
