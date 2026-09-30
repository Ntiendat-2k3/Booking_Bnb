const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 5000, socketTimeout: 10000 });
}
const transporter = createTransporter();

/** Lỗi gửi mail phải được trả về worker để retry; không báo gửi thành công khi chưa có cấu hình. */
async function sendEmail(to, subject, html) {
  if (process.env.GAS_MAIL_URL) {
    const response = await fetch(process.env.GAS_MAIL_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Mail service failed");
    const result = await response.json();
    if (result.status !== "success") throw new Error("Mail delivery failed");
    return { messageId: "GAS-" + Date.now() };
  }
  if (!transporter) throw new Error("Email is not configured");
  const from = process.env.SMTP_FROM || `"Booking BnB" <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ from, to, subject, html });
}
module.exports = { transporter, sendEmail };