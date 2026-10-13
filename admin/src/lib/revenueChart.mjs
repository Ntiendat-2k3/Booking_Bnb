/** Chuẩn hóa dữ liệu tháng mới và nhãn cũ khi API, admin được cập nhật lệch thời điểm. */
export function formatRevenueChartData(rows, locale) {
  const formatter = new Intl.DateTimeFormat(locale === "vn" ? "vi-VN" : "en-US", {
    month: "short", year: "numeric", timeZone: "UTC",
  });

  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const month = row?.month;
    const date = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ? new Date(`${month}-01T00:00:00Z`)
      : null;
    const name = date && Number.isFinite(date.getTime())
      ? formatter.format(date)
      : typeof row?.name === "string" ? row.name : "";
    return name ? [{ name, value: Number(row.value) || 0 }] : [];
  });
}
