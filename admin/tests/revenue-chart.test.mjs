import assert from "node:assert/strict";
import test from "node:test";
import { formatRevenueChartData } from "../src/lib/revenueChart.mjs";

test("biểu đồ chấp nhận dữ liệu tháng mới và nhãn API cũ", () => {
  const rows = formatRevenueChartData([
    { month: "2026-03", value: "30000000" },
    { name: "Apr", value: 0 },
  ], "vn");
  assert.equal(rows[0].name, new Intl.DateTimeFormat("vi-VN", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date("2026-03-01T00:00:00Z")));
  assert.equal(rows[0].value, 30000000);
  assert.deepEqual(rows[1], { name: "Apr", value: 0 });
});

test("biểu đồ bỏ qua mốc tháng sai mà không gây lỗi trang", () => {
  assert.deepEqual(formatRevenueChartData([{ month: "2026-13", value: 1 }, { value: 2 }], "vn"), []);
  assert.deepEqual(formatRevenueChartData(null, "en"), []);
});
