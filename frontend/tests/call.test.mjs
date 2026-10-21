import test from "node:test";
import assert from "node:assert/strict";
import { isTerminalCall, mergeCallState } from "../src/features/chat/utils/mergeCallState.mjs";

test("Call terminal không bị event cũ hồi sinh sau reconnect", () => {
  const ringing = { id: "call-1", status: "ringing", last_state_changed_at: "2026-10-20T10:00:00.000Z" };
  const connected = { ...ringing, status: "connected", last_state_changed_at: "2026-10-20T10:00:10.000Z" };
  const ended = { ...ringing, status: "ended", last_state_changed_at: "2026-10-20T10:00:20.000Z" };
  assert.equal(mergeCallState(null, ringing), ringing);
  assert.equal(mergeCallState(connected, ringing), connected);
  assert.equal(mergeCallState(ended, connected), ended);
  assert.equal(mergeCallState(ended, ringing), ended);
  assert.equal(isTerminalCall(ended), true);
});

test("Call mới hơn thay call cũ dù event terminal đã thất lạc", () => {
  const active = { id: "call-1", status: "connected", created_at: "2026-10-20T10:00:00.000Z",
    last_state_changed_at: "2026-10-20T10:00:10.000Z" };
  const ended = { ...active, status: "ended", last_state_changed_at: "2026-10-20T10:00:20.000Z" };
  const next = { id: "call-2", status: "ringing", created_at: "2026-10-20T10:01:00.000Z",
    last_state_changed_at: "2026-10-20T10:01:00.000Z" };
  assert.equal(mergeCallState(active, next), next);
  assert.equal(mergeCallState(ended, next), next);
  assert.equal(mergeCallState(next, ended), next);
});

test("Revision server giữ state mới khi hai chuyển trạng thái cùng mili giây", () => {
  const connected = { id: "call-1", status: "connected", revision: 4,
    last_state_changed_at: "2026-10-20T10:00:00.000Z" };
  const ended = { ...connected, status: "ended", revision: 5 };
  assert.equal(mergeCallState(ended, connected), ended);
  assert.equal(mergeCallState(connected, ended), ended);
});
