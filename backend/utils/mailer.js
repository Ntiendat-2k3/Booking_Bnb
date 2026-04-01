const nodemailer = require("nodemailer");

// Cấu hình Transporter bằng Gmail từ bản mẫu của khách hàng
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Sử dụng SSL cho cổng 465
  auth: {
    user: "nguyentiendatg2003@gmail.com",
    pass: "wbwa soib ekvw rxkr", // Mật khẩu ứng dụng của host
  },
});

/**
 * Hàm gửi email dùng chung cho toàn hệ thống
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung email định dạng HTML
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: '"Hệ thống Booking BnB" <nguyentiendatg2003@gmail.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[Mailer] Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("[Mailer] Error sending email:", error);
    // Không quan trọng đến mức làm gián đoạn luồng chính, nhưng nên log lại
    return null;
  }
};

module.exports = {
  transporter,
  sendEmail,
};
