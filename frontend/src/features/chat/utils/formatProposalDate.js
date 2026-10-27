/** Hiển thị ngày đặt phòng theo ngày-tháng-năm mà không đổi múi giờ của DATEONLY. */
export function formatProposalDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
