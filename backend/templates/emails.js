function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function message(title, paragraphs) {
  return `<h3>${escapeHtml(title)}</h3>${paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}<p>Trân trọng,<br/>Đội ngũ Booking BnB</p>`;
}

function resetPassword(url) {
  const safeUrl = escapeHtml(url);
  return `<h3>Khôi phục mật khẩu</h3><p><a href="${safeUrl}">Đặt lại mật khẩu</a></p><p>Đường dẫn có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>`;
}

/** Mã chỉ dành cho bước đăng ký và hết hiệu lực sau 10 phút. */
function registrationCode(code) {
  return `<h3>Xác minh email đăng ký Booking BnB</h3><p>Mã xác minh của bạn:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p><p>Mã có hiệu lực trong 10 phút. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>`;
}

module.exports = { message, resetPassword, registrationCode };
