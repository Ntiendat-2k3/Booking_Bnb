import test from "node:test";
import assert from "node:assert/strict";
import { notificationTarget, relativeNotificationTime } from "../src/features/notifications/notificationView.mjs";

test("Điều hướng thông báo theo tài nguyên và fallback chỗ nghỉ cũ", () => {
  assert.equal(notificationTarget({ resource_type: "conversation", resource_id: "chat-1" }), "/messages/chat-1");
  assert.equal(notificationTarget({ resource_type: "booking" }), "/trips");
  assert.equal(notificationTarget({ resource_type: "host_booking" }), "/host/dashboard");
  assert.equal(notificationTarget({ resource_type: "listing", resource_id: "room-1" }), "/host/listings/room-1");
  assert.equal(notificationTarget({ type: "listing_rejected" }), "/host/listings");
  assert.equal(notificationTarget({ type: "unknown" }), null);
});

test("Thời gian tương đối hiển thị theo ngôn ngữ", () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
  assert.match(relativeNotificationTime(fiveMinutesAgo, "vi", "Vừa xong"), /5 phút trước/);
  assert.match(relativeNotificationTime(fiveMinutesAgo, "en", "Just now"), /5 minutes ago/);
  assert.equal(relativeNotificationTime(new Date(), "vi", "Vừa xong"), "Vừa xong");
});
