import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeMessage } from "../src/features/chat/utils/mergeMessage.mjs";
import { afterLoginPath } from "../src/lib/afterLoginPath.mjs";

test("Nhãn online và offline có bản dịch cho cả hai ngôn ngữ", () => {
  for (const locale of ["vn", "en"]) {
    const messages = JSON.parse(readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8"));
    assert.ok(messages.chat.online);
    assert.ok(messages.chat.offline);
  }
});

test("Phản hồi HTTP và socket cho cùng khóa retry chỉ hiện một tin", () => {
  const pending = { id: "pending:key", client_key: "key", sender_id: "user", status: "pending" };
  const persisted = { id: "server-id", client_key: "key", sender_id: "user", sequence: 1 };
  assert.deepEqual(mergeMessage([pending], persisted), [persisted]);
  assert.deepEqual(mergeMessage([persisted], persisted), [persisted]);
});

test("Tin của hai người có khóa khác nhau vẫn được giữ", () => {
  const first = { id: "one", client_key: "one", sender_id: "guest" };
  const second = { id: "two", client_key: "two", sender_id: "host" };
  assert.deepEqual(mergeMessage([first], second), [first, second]);
});

test("Tin realtime đến lệch thứ tự và trang cũ tải trùng vẫn giữ sequence tăng dần", () => {
  const message = (id, sequence) => ({ id, client_key: id, sender_id: "guest", sequence });
  const third = message("third", "3");
  const first = message("first", "1");
  const second = message("second", "2");
  const items = [third, first, second, first].reduce(mergeMessage, []);
  assert.deepEqual(items.map((item) => item.id), ["first", "second", "third"]);
});

test("Retry đến sau response không biến tin đã lưu thành pending", () => {
  const saved = { id: "saved", client_key: "key", sender_id: "guest", sequence: "4" };
  const pending = { id: "pending:key", client_key: "key", sender_id: "guest", status: "pending" };
  assert.deepEqual(mergeMessage([saved], pending), [saved]);
});

test("Đăng nhập quay lại phòng dự định mà không nhận đường dẫn bên ngoài", () => {
  const values = new Map([["booking-chat-next", "/messages?listing=10000000-0000-4000-8000-000000000004"]]);
  globalThis.window = { sessionStorage: { getItem: (key) => values.get(key) || null } };
  try {
    assert.equal(afterLoginPath(), values.get("booking-chat-next"));
    values.set("booking-chat-next", "https://example.com/");
    assert.equal(afterLoginPath(), "/profile");
    values.set("booking-qr-approval", "pending");
    assert.equal(afterLoginPath(), "/auth/qr/approve");
  } finally { delete globalThis.window; }
});
