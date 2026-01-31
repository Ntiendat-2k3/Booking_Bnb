const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function apiUrl(path) {
  if (path.startsWith("http")) return path;
  return API_BASE.replace(/\/$/, "") + path;
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function shouldRetry(method, status) {
  // Retry only idempotent requests on transient errors
  if (!["GET", "HEAD"].includes(method)) return false;
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Safe defaults:
 * - credentials: "include" to send httpOnly cookies (access + refresh)
 * - CSRF: double-submit cookie. For unsafe methods, send X-CSRF-Token = csrf_token cookie.
 *
 * Extra reliability:
 * - timeout (default 15s)
 * - abort support via opts.signal (we combine it with our internal timeout)
 * - optional retry for GET/HEAD on transient errors (default 1 retry)
 */
export async function apiFetch(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 15000;
  const retries = Number.isFinite(opts.retries) ? opts.retries : 1;

  // Build headers
  const headers = new Headers(opts.headers || {});

  // Only set JSON content-type when we actually send JSON
  const hasBody = opts.body !== undefined && opts.body !== null;
  if (
    hasBody &&
    !headers.has("Content-Type") &&
    typeof opts.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  // CSRF for unsafe methods
  if (unsafe && !headers.has("X-CSRF-Token")) {
    const csrf = getCookie(
      process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "csrf_token",
    );
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  // Abort controller for timeout (+ optional upstream abort)
  const ac = new AbortController();
  const upstream = opts.signal;

  function onUpstreamAbort() {
    try {
      ac.abort(upstream.reason || new DOMException("Aborted", "AbortError"));
    } catch {
      ac.abort();
    }
  }
  if (upstream) {
    if (upstream.aborted) onUpstreamAbort();
    else upstream.addEventListener("abort", onUpstreamAbort, { once: true });
  }

  const t = setTimeout(() => {
    try {
      ac.abort(new DOMException("Request timeout", "TimeoutError"));
    } catch {
      ac.abort();
    }
  }, timeoutMs);

  try {
    let attempt = 0;
    while (true) {
      attempt += 1;

      let res;
      try {
        res = await fetch(apiUrl(path), {
          credentials: "include",
          ...opts,
          signal: ac.signal,
          headers,
        });
      } catch (e) {
        // network error
        if (attempt <= retries && ["GET", "HEAD"].includes(method)) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
        throw e;
      }

      if (res.status === 204) return null;

      const ct = res.headers.get("content-type") || "";
      let data = null;

      if (ct.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        const text = await res.text();
        data = safeJsonParse(text) ?? text ?? null;
      }

      if (!res.ok) {
        if (attempt <= retries && shouldRetry(method, res.status)) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
        const message =
          data && typeof data === "object" && data.message
            ? data.message
            : "Request failed";
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    }
  } finally {
    clearTimeout(t);
    if (upstream) upstream.removeEventListener?.("abort", onUpstreamAbort);
  }
}
