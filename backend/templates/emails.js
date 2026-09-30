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

module.exports = { message, resetPassword };
