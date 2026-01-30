const { createClient } = require("redis");

let _client = null;
let _ready = false;

function isRedisDisabled() {
  // allow opt-out for local/dev environments
  const disabled = String(process.env.REDIS_DISABLED || "").toLowerCase();
  const cacheEnabled = String(
    process.env.CACHE_ENABLED || "true",
  ).toLowerCase();
  return (
    disabled === "1" ||
    disabled === "true" ||
    cacheEnabled === "0" ||
    cacheEnabled === "false"
  );
}

function buildRedisOptions() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  return {
    socket: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      reconnectStrategy: (retries) => {
        // exponential backoff, cap at 2s
        return Math.min(retries * 50, 2000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
  };
}

async function connectRedis() {
  if (isRedisDisabled()) return null;

  if (_client) return _client;

  _client = createClient(buildRedisOptions());

  _client.on("error", (err) => {
    // Don't crash the process: caching is optional.
    console.error("[redis] error:", err?.message || err);
  });
  _client.on("ready", () => {
    _ready = true;
    console.log("[redis] connected");
  });
  _client.on("end", () => {
    _ready = false;
    console.warn("[redis] disconnected");
  });

  try {
    await _client.connect();
  } catch (e) {
    // If redis is down/misconfigured, keep server running without cache.
    console.warn("[redis] connect failed (cache disabled):", e?.message || e);
    try {
      await _client.quit();
    } catch {}
    _client = null;
    _ready = false;
    return null;
  }

  return _client;
}

function getRedis() {
  return _client;
}

function redisReady() {
  return Boolean(_client && _ready);
}

module.exports = {
  connectRedis,
  getRedis,
  redisReady,
};
