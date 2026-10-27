import test from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import api, { setManualCsrfToken } from "../src/lib/api.js";

function response(config, status, data) {
  return { config, status, data, headers: {}, statusText: "" };
}

test("API ưu tiên CSRF cookie mới hơn token cũ trong bộ nhớ", async () => {
  const previousAdapter = api.defaults.adapter;
  globalThis.document = { cookie: "csrf_token=current-token" };
  setManualCsrfToken("stale-token");
  api.defaults.adapter = async (config) => {
    assert.equal(config.headers["X-CSRF-Token"], "current-token");
    return response(config, 200, { ok: true });
  };

  try {
    assert.deepEqual(await api.post("/api/v1/chat/listings/listing-id", {}), { ok: true });
  } finally {
    api.defaults.adapter = previousAdapter;
    setManualCsrfToken(null);
    delete globalThis.document;
  }
});

test("API làm mới CSRF khi bị từ chối rồi thử lại thao tác liên hệ một lần", async () => {
  const previousAdapter = api.defaults.adapter;
  const requests = [];
  setManualCsrfToken("stale-token");
  api.defaults.adapter = async (config) => {
    requests.push([config.url, config.headers["X-CSRF-Token"]]);
    if (config.url === "/api/v1/auth/csrf") {
      return response(config, 200, { data: { csrfToken: "fresh-token" } });
    }
    if (requests.length === 1) {
      throw new AxiosError("CSRF token invalid", AxiosError.ERR_BAD_REQUEST, config, null,
        response(config, 403, { message: "CSRF token invalid" }));
    }
    return response(config, 200, { data: { id: "conversation-id" } });
  };

  try {
    assert.deepEqual(await api.post("/api/v1/chat/listings/listing-id", {}), {
      data: { id: "conversation-id" },
    });
    assert.deepEqual(requests, [
      ["/api/v1/chat/listings/listing-id", "stale-token"],
      ["/api/v1/auth/csrf", undefined],
      ["/api/v1/chat/listings/listing-id", "fresh-token"],
    ]);
  } finally {
    api.defaults.adapter = previousAdapter;
    setManualCsrfToken(null);
  }
});

test("API cập nhật CSRF trên yêu cầu gốc sau khi làm mới phiên đăng nhập", async () => {
  const previousAdapter = api.defaults.adapter;
  const requests = [];
  setManualCsrfToken("stale-token");
  api.defaults.adapter = async (config) => {
    requests.push([config.url, config.headers["X-CSRF-Token"]]);
    if (config.url === "/api/v1/auth/csrf") {
      return response(config, 200, { data: { csrfToken: "fresh-token" } });
    }
    if (config.url === "/api/v1/auth/refresh") {
      return response(config, 200, { data: { ok: true } });
    }
    if (requests.length === 1) {
      throw new AxiosError("Unauthorized", AxiosError.ERR_BAD_REQUEST, config, null,
        response(config, 401, { message: "Unauthorized" }));
    }
    return response(config, 200, { data: { id: "conversation-id" } });
  };

  try {
    assert.deepEqual(await api.post("/api/v1/chat/listings/listing-id", {}), {
      data: { id: "conversation-id" },
    });
    assert.deepEqual(requests, [
      ["/api/v1/chat/listings/listing-id", "stale-token"],
      ["/api/v1/auth/csrf", undefined],
      ["/api/v1/auth/refresh", "fresh-token"],
      ["/api/v1/chat/listings/listing-id", "fresh-token"],
    ]);
  } finally {
    api.defaults.adapter = previousAdapter;
    setManualCsrfToken(null);
  }
});

test("API dừng sau một lần thử lại nếu CSRF vẫn bị từ chối", async () => {
  const previousAdapter = api.defaults.adapter;
  let contactAttempts = 0;
  setManualCsrfToken("stale-token");
  api.defaults.adapter = async (config) => {
    if (config.url === "/api/v1/auth/csrf") {
      return response(config, 200, { data: { csrfToken: "fresh-token" } });
    }
    contactAttempts += 1;
    throw new AxiosError("CSRF token invalid", AxiosError.ERR_BAD_REQUEST, config, null,
      response(config, 403, { message: "CSRF token invalid" }));
  };

  try {
    await assert.rejects(api.post("/api/v1/chat/listings/listing-id", {}), {
      message: "CSRF token invalid",
      status: 403,
    });
    assert.equal(contactAttempts, 2);
  } finally {
    api.defaults.adapter = previousAdapter;
    setManualCsrfToken(null);
  }
});
