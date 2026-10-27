import test from "node:test";
import assert from "node:assert/strict";
import { apiFetch, setManualCsrfToken } from "../src/lib/api.js";

test("Admin ưu tiên CSRF cookie mới hơn token cũ trong bộ nhớ", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.document = { cookie: "csrf_token=current-token" };
  setManualCsrfToken("stale-token");
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("X-CSRF-Token"), "current-token");
    return Response.json({ ok: true });
  };
  try {
    assert.deepEqual(await apiFetch("/api/v1/admin/users/1/role", {
      method: "PATCH", body: JSON.stringify({ role: "host" }),
    }), { ok: true });
  } finally {
    globalThis.fetch = previousFetch;
    delete globalThis.document;
    setManualCsrfToken(null);
  }
});

test("Admin làm mới CSRF và thử lại thao tác ghi đúng một lần", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  setManualCsrfToken("stale-token");
  globalThis.fetch = async (url, options) => {
    requests.push([url, options.headers.get("X-CSRF-Token"), options.body]);
    if (url.endsWith("/auth/csrf"))
      return Response.json({ data: { csrfToken: "fresh-token" } });
    if (requests.length === 1)
      return Response.json({ message: "CSRF token invalid" }, { status: 403 });
    return Response.json({ ok: true });
  };
  try {
    const body = JSON.stringify({ role: "host" });
    assert.deepEqual(await apiFetch("/api/v1/admin/users/1/role", { method: "PATCH", body }), { ok: true });
    assert.deepEqual(requests.map(([url, token, requestBody]) =>
      [url.endsWith("/auth/csrf") ? "csrf" : "write", token, requestBody]), [
      ["write", "stale-token", body],
      ["csrf", null, undefined],
      ["write", "fresh-token", body],
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    setManualCsrfToken(null);
  }
});

test("Admin dừng sau một lần thử lại khi CSRF vẫn bị từ chối", async () => {
  const previousFetch = globalThis.fetch;
  let writes = 0;
  setManualCsrfToken("stale-token");
  globalThis.fetch = async (url) => {
    if (url.endsWith("/auth/csrf"))
      return Response.json({ data: { csrfToken: "fresh-token" } });
    writes += 1;
    return Response.json({ message: "CSRF token invalid" }, { status: 403 });
  };
  try {
    await assert.rejects(apiFetch("/api/v1/admin/users/1/role", { method: "PATCH" }),
      { status: 403, message: "CSRF token invalid" });
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = previousFetch;
    setManualCsrfToken(null);
  }
});
